import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requirePlatformAuth } from "../middleware/platformAuth";
import { recordBillingAudit } from "../services/billingAudit";
import { Prisma, SubscriptionStatus } from "@prisma/client";

// Split out of platform.routes.ts (tenant CRUD/auth) purely for file size - same
// requirePlatformAuth gate, same /api/platform mount point (see index.ts).
const router = Router();
router.use(requirePlatformAuth);

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED", "SUSPENDED"];

/** Normalizes a subscription's billing interval into a monthly-equivalent revenue figure. */
function monthlyEquivalent(monthlyPrice: number, annualPrice: number | null, interval: "MONTHLY" | "YEARLY"): number {
  if (interval === "YEARLY" && annualPrice != null) return annualPrice / 12;
  return monthlyPrice;
}

// Subscription statuses that represent a tenant SalesGrid is actually collecting money from
// right now - TRIALING is excluded (not yet paying), CANCELLED/EXPIRED/SUSPENDED are excluded
// (no longer paying). Used for MRR/ARR everywhere below so the figure is never inflated by
// trials or overstated for a lapsed subscription.
const REVENUE_STATUSES: SubscriptionStatus[] = ["ACTIVE", "PAST_DUE"];

// ============================================================================
// Dashboard KPIs
// ============================================================================
router.get(
  "/dashboard/stats",
  asyncHandler(async (_req, res) => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [statusCounts, tenantStatusCounts, totalTenants, totalSalespersons, newTenants30d, failedPayments30d, revenueSubs] =
      await Promise.all([
        prisma.subscription.groupBy({ by: ["status"], _count: true }),
        prisma.tenant.groupBy({ by: ["status"], _count: true }),
        prisma.tenant.count(),
        prisma.salesperson.count(),
        prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.billingEvent.count({ where: { eventType: "payment.failed", createdAt: { gte: thirtyDaysAgo } } }),
        prisma.subscription.findMany({
          where: { status: { in: REVENUE_STATUSES } },
          select: { billingInterval: true, plan: { select: { monthlyPrice: true, annualPrice: true } } },
        }),
      ]);

    const byStatus = Object.fromEntries(SUBSCRIPTION_STATUSES.map((s) => [s, 0])) as Record<SubscriptionStatus, number>;
    for (const row of statusCounts) byStatus[row.status] = row._count;

    const suspendedTenants = tenantStatusCounts.find((t) => t.status === "SUSPENDED")?._count ?? 0;
    const activeTenants = tenantStatusCounts.find((t) => t.status === "ACTIVE")?._count ?? 0;

    const mrr = revenueSubs.reduce((sum, s) => sum + monthlyEquivalent(s.plan.monthlyPrice, s.plan.annualPrice, s.billingInterval), 0);

    res.json({
      tenants: {
        total: totalTenants,
        active: activeTenants,
        suspended: suspendedTenants,
        newLast30d: newTenants30d,
      },
      subscriptions: {
        trialing: byStatus.TRIALING,
        active: byStatus.ACTIVE,
        pastDue: byStatus.PAST_DUE,
        cancelled: byStatus.CANCELLED,
        expired: byStatus.EXPIRED,
        suspended: byStatus.SUSPENDED,
      },
      salespersons: { total: totalSalespersons },
      revenue: {
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        currency: "INR",
        note: "Recurring-revenue estimate from active/past-due subscriptions' plan prices, not a ledger of amounts actually captured.",
      },
      failedPaymentsLast30d: failedPayments30d,
    });
  })
);

// ============================================================================
// Subscriptions across all tenants
// ============================================================================
router.get(
  "/subscriptions",
  asyncHandler(async (req, res) => {
    const { status, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: Prisma.SubscriptionWhereInput = {};
    if (status && SUBSCRIPTION_STATUSES.includes(status as SubscriptionStatus)) where.status = status as SubscriptionStatus;

    const take = Math.min(parseInt(pageSize, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: { plan: true, tenant: { select: { id: true, name: true, status: true } } },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.subscription.count({ where }),
    ]);

    const salespersonCounts = await prisma.salesperson.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: items.map((s) => s.tenantId) } },
      _count: true,
    });
    const spCountMap = new Map(salespersonCounts.map((s) => [s.tenantId, s._count]));

    res.json({
      items: items.map((s) => ({
        id: s.id,
        tenantId: s.tenantId,
        tenantName: s.tenant.name,
        tenantStatus: s.tenant.status,
        planKey: s.plan.key,
        planName: s.plan.name,
        status: s.status,
        billingInterval: s.billingInterval,
        trialEnd: s.trialEnd,
        currentPeriodEnd: s.currentPeriodEnd,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        providerSubscriptionId: s.providerSubscriptionId,
        salespersonCount: spCountMap.get(s.tenantId) ?? 0,
        maxSalespersons: s.plan.maxSalespersons,
        createdAt: s.createdAt,
      })),
      total,
      page: Number(page),
      pageSize: take,
    });
  })
);

// ============================================================================
// Payments - derived from BillingEvent payloads (no separate Payment table; the raw webhook
// payload already carries everything Razorpay knows about a charge). Only events that actually
// carry a `payment` entity are shown - a webhook that doesn't (e.g. a bare subscription-status
// event) contributes nothing here.
// ============================================================================
const PAYMENT_BEARING_EVENT_TYPES = ["payment.captured", "payment.failed", "subscription.charged"];

interface DerivedPayment {
  billingEventId: string;
  eventType: string;
  razorpayPaymentId: string;
  razorpaySubscriptionId: string | null;
  amount: number | null;
  currency: string;
  status: string;
  tenantId: string | null;
  createdAt: Date;
}

function extractPayment(row: { id: string; eventType: string; payload: unknown; createdAt: Date }): DerivedPayment | null {
  const payload = row.payload as {
    payload?: {
      payment?: { entity?: { id: string; amount?: number; currency?: string; status?: string; notes?: Record<string, string> } };
      subscription?: { entity?: { id: string; notes?: Record<string, string> } };
    };
  };
  const paymentEntity = payload?.payload?.payment?.entity;
  if (!paymentEntity) return null;
  const subEntity = payload?.payload?.subscription?.entity;

  return {
    billingEventId: row.id,
    eventType: row.eventType,
    razorpayPaymentId: paymentEntity.id,
    razorpaySubscriptionId: subEntity?.id ?? null,
    amount: typeof paymentEntity.amount === "number" ? paymentEntity.amount / 100 : null,
    currency: paymentEntity.currency?.toUpperCase() ?? "INR",
    status: paymentEntity.status ?? (row.eventType === "payment.failed" ? "failed" : "captured"),
    tenantId: paymentEntity.notes?.tenantId ?? subEntity?.notes?.tenantId ?? null,
    createdAt: row.createdAt,
  };
}

router.get(
  "/payments",
  asyncHandler(async (req, res) => {
    const { status, tenantId, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const take = Math.min(parseInt(pageSize, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    // Filtering/pagination happens on BillingEvent rows (indexed, cheap); the payment shape is
    // then derived in application code, so a page can come back with fewer than `pageSize` items
    // if some events in that window don't carry a payment entity - acceptable for an admin table
    // over what is expected to be a small, mostly-payment-bearing event stream.
    const [rows, total] = await Promise.all([
      prisma.billingEvent.findMany({
        where: { eventType: { in: PAYMENT_BEARING_EVENT_TYPES } },
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: { id: true, eventType: true, payload: true, createdAt: true },
      }),
      prisma.billingEvent.count({ where: { eventType: { in: PAYMENT_BEARING_EVENT_TYPES } } }),
    ]);

    let payments = rows.map(extractPayment).filter((p): p is DerivedPayment => p !== null);
    if (status) payments = payments.filter((p) => p.status === status);

    const tenantIds = [...new Set(payments.map((p) => p.tenantId).filter((id): id is string => !!id))];
    const tenants = tenantIds.length ? await prisma.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } }) : [];
    const tenantNameMap = new Map(tenants.map((t) => [t.id, t.name]));

    if (tenantId) payments = payments.filter((p) => p.tenantId === tenantId);

    res.json({
      items: payments.map((p) => ({ ...p, tenantName: p.tenantId ? tenantNameMap.get(p.tenantId) ?? null : null })),
      total,
      page: Number(page),
      pageSize: take,
    });
  })
);

// ============================================================================
// Billing events (raw webhook deliveries)
// ============================================================================
router.get(
  "/billing-events",
  asyncHandler(async (req, res) => {
    const { eventType, processed, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: Prisma.BillingEventWhereInput = {};
    if (eventType) where.eventType = eventType;
    if (processed === "true" || processed === "false") where.processed = processed === "true";

    const take = Math.min(parseInt(pageSize, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.billingEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: { id: true, provider: true, eventId: true, eventType: true, processed: true, processedAt: true, createdAt: true, payload: true },
      }),
      prisma.billingEvent.count({ where }),
    ]);

    res.json({
      items: items.map((e) => {
        const payload = e.payload as { payload?: { subscription?: { entity?: { notes?: Record<string, string> } }; payment?: { entity?: { notes?: Record<string, string> } } } };
        const tenantId = payload?.payload?.subscription?.entity?.notes?.tenantId ?? payload?.payload?.payment?.entity?.notes?.tenantId ?? null;
        return {
          id: e.id,
          provider: e.provider,
          eventId: e.eventId,
          eventType: e.eventType,
          processed: e.processed,
          processedAt: e.processedAt,
          createdAt: e.createdAt,
          tenantId,
        };
      }),
      total,
      page: Number(page),
      pageSize: take,
    });
  })
);

// Full payload only on the detail view, never the list - Razorpay webhook payloads never carry
// KEY_SECRET/WEBHOOK_SECRET (those exist purely to verify the delivery, not inside it), but this
// keeps the list endpoint's response small regardless.
router.get(
  "/billing-events/:id",
  asyncHandler(async (req, res) => {
    const event = await prisma.billingEvent.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: "Not found" });
    res.json(event);
  })
);

// ============================================================================
// Plan management
// ============================================================================
const planCreateSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  monthlyPrice: z.number().nonnegative(),
  annualPrice: z.number().nonnegative().optional().nullable(),
  maxSalespersons: z.number().int().positive(),
  maxAdmins: z.number().int().positive(),
  trialDays: z.number().int().min(0).optional(),
  features: z.record(z.boolean()).optional(),
  isActive: z.boolean().optional(),
});

router.post(
  "/plans",
  asyncHandler(async (req, res) => {
    const data = planCreateSchema.parse(req.body);
    const existing = await prisma.subscriptionPlan.findUnique({ where: { key: data.key } });
    if (existing) return res.status(409).json({ error: "A plan with this key already exists" });

    const plan = await prisma.subscriptionPlan.create({ data });
    await recordBillingAudit({
      actorType: "PLATFORM_ADMIN",
      actorId: req.platformAuth!.platformAdminId,
      action: "PLAN_CREATED",
      newState: { key: plan.key, name: plan.name, monthlyPrice: plan.monthlyPrice },
    });
    res.status(201).json(plan);
  })
);

const planUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  monthlyPrice: z.number().nonnegative().optional(),
  annualPrice: z.number().nonnegative().optional().nullable(),
  maxSalespersons: z.number().int().positive().optional(),
  maxAdmins: z.number().int().positive().optional(),
  trialDays: z.number().int().min(0).optional(),
  features: z.record(z.boolean()).optional(),
  isActive: z.boolean().optional(),
  razorpayMonthlyPlanId: z.string().optional().nullable(),
  razorpayYearlyPlanId: z.string().optional().nullable(),
});

router.patch(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const data = planUpdateSchema.parse(req.body);
    const before = await prisma.subscriptionPlan.findUnique({ where: { id: req.params.id } });
    if (!before) return res.status(404).json({ error: "Not found" });

    const plan = await prisma.subscriptionPlan.update({ where: { id: req.params.id }, data });
    await recordBillingAudit({
      actorType: "PLATFORM_ADMIN",
      actorId: req.platformAuth!.platformAdminId,
      action: "PLAN_UPDATED",
      previousState: { name: before.name, monthlyPrice: before.monthlyPrice, isActive: before.isActive },
      newState: { name: plan.name, monthlyPrice: plan.monthlyPrice, isActive: plan.isActive },
    });
    res.json(plan);
  })
);

// ============================================================================
// Analytics
// ============================================================================
router.get(
  "/analytics",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [subs, tenantsCreated, plans, statusCounts, cancelledLast30d, newTenants30d, paymentEvents] = await Promise.all([
      prisma.subscription.findMany({
        where: { status: { in: REVENUE_STATUSES } },
        select: { billingInterval: true, planId: true, plan: { select: { key: true, name: true, monthlyPrice: true, annualPrice: true } } },
      }),
      prisma.tenant.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
      prisma.subscriptionPlan.findMany({ where: { isActive: true }, select: { key: true, name: true } }),
      prisma.subscription.groupBy({ by: ["status"], _count: true }),
      prisma.billingAuditLog.count({ where: { action: "WEBHOOK_SUBSCRIPTION_CANCELLED", createdAt: { gte: thirtyDaysAgo } } }),
      prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.billingEvent.findMany({
        where: { eventType: { in: PAYMENT_BEARING_EVENT_TYPES }, createdAt: { gte: sixMonthsAgo } },
        select: { eventType: true, payload: true, createdAt: true },
      }),
    ]);

    const mrr = subs.reduce((sum, s) => sum + monthlyEquivalent(s.plan.monthlyPrice, s.plan.annualPrice, s.billingInterval), 0);

    const subscriptionsByPlan = plans.map((p) => ({
      planKey: p.key,
      planName: p.name,
      count: subs.filter((s) => s.plan.key === p.key).length,
    }));

    function monthKey(d: Date) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));

    const tenantGrowthByMonth = months.map((m) => ({
      month: m,
      count: tenantsCreated.filter((t) => monthKey(t.createdAt) === m).length,
    }));

    const revenueByMonthMap = new Map(months.map((m) => [m, 0]));
    for (const row of paymentEvents) {
      const derived = extractPayment({ id: "", eventType: row.eventType, payload: row.payload, createdAt: row.createdAt });
      if (!derived || derived.amount == null || derived.status !== "captured") continue;
      const key = monthKey(row.createdAt);
      if (revenueByMonthMap.has(key)) revenueByMonthMap.set(key, (revenueByMonthMap.get(key) ?? 0) + derived.amount);
    }

    res.json({
      revenue: { mrr: Math.round(mrr), arr: Math.round(mrr * 12), currency: "INR" },
      revenueByMonth: months.map((m) => ({ month: m, amount: Math.round(revenueByMonthMap.get(m) ?? 0) })),
      revenueByMonthNote: "Sum of captured-payment webhook amounts per month - empty until real Razorpay payments have been received.",
      tenantGrowthByMonth,
      subscriptionsByPlan,
      subscriptionsByStatus: SUBSCRIPTION_STATUSES.map((s) => ({
        status: s,
        count: statusCounts.find((c) => c.status === s)?._count ?? 0,
      })),
      newTenantsLast30d: newTenants30d,
      cancellationsLast30d: cancelledLast30d,
    });
  })
);

export default router;
