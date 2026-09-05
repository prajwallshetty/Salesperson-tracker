import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { comparePassword, hashPassword, signPlatformToken } from "../lib/auth";
import { requirePlatformAuth, PLATFORM_AUTH_COOKIE_NAME } from "../middleware/platformAuth";
import { recordBillingAudit } from "../services/billingAudit";
import { authRateLimit } from "../middleware/rateLimit";

const router = Router();

const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function platformCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  };
}

router.post(
  "/login",
  authRateLimit,
  asyncHandler(async (req, res) => {
    const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const admin = await prisma.platformAdmin.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin || !admin.isActive) return res.status(401).json({ error: "Invalid email or password" });
    const ok = await comparePassword(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = signPlatformToken({ platformAdminId: admin.id });
    res.cookie(PLATFORM_AUTH_COOKIE_NAME, token, platformCookieOptions());
    res.json({ admin: { id: admin.id, name: admin.name, email: admin.email } });
  })
);

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    res.clearCookie(PLATFORM_AUTH_COOKIE_NAME, platformCookieOptions());
    res.status(204).end();
  })
);

router.get(
  "/me",
  requirePlatformAuth,
  asyncHandler(async (req, res) => {
    const admin = await prisma.platformAdmin.findUnique({ where: { id: req.platformAuth!.platformAdminId } });
    if (!admin) return res.status(404).json({ error: "Not found" });
    res.json({ id: admin.id, name: admin.name, email: admin.email });
  })
);

router.patch(
  "/me/password",
  requirePlatformAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = z
      .object({ currentPassword: z.string().min(1), newPassword: z.string().min(6) })
      .parse(req.body);
    const admin = await prisma.platformAdmin.findUnique({ where: { id: req.platformAuth!.platformAdminId } });
    if (!admin) return res.status(404).json({ error: "Not found" });
    const ok = await comparePassword(currentPassword, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
    const passwordHash = await hashPassword(newPassword);
    await prisma.platformAdmin.update({ where: { id: admin.id }, data: { passwordHash } });
    res.json({ ok: true });
  })
);

router.use(requirePlatformAuth);

// Cross-tenant visibility is the whole point of this router - it is the one place in the
// codebase allowed to query tenant-owned tables without a tenantId filter, and it's reachable
// only via requirePlatformAuth (a completely separate credential from every tenant user).
router.get(
  "/tenants",
  asyncHandler(async (req, res) => {
    const { search, status, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: "insensitive" };
    const take = Math.min(parseInt(pageSize, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { users: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.tenant.count({ where }),
    ]);

    const salespersonCounts = await prisma.salesperson.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: items.map((t) => t.id) } },
      _count: true,
    });
    const spCountMap = new Map(salespersonCounts.map((s) => [s.tenantId, s._count]));

    res.json({
      items: items.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        createdAt: t.createdAt,
        userCount: t._count.users,
        salespersonCount: spCountMap.get(t.id) ?? 0,
        subscription: t.subscription
          ? {
              status: t.subscription.status,
              planName: t.subscription.plan.name,
              planKey: t.subscription.plan.key,
              currentPeriodEnd: t.subscription.currentPeriodEnd,
            }
          : null,
      })),
      total,
      page: Number(page),
      pageSize: take,
    });
  })
);

router.get(
  "/tenants/:id",
  asyncHandler(async (req, res) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: { subscription: { include: { plan: true } } },
    });
    if (!tenant) return res.status(404).json({ error: "Not found" });
    const [userCount, salespersonCount, customerCount, billingCustomer, lastPaymentAudit] = await Promise.all([
      prisma.user.count({ where: { tenantId: tenant.id } }),
      prisma.salesperson.count({ where: { tenantId: tenant.id } }),
      prisma.customer.count({ where: { tenantId: tenant.id } }),
      prisma.billingCustomer.findUnique({ where: { tenantId: tenant.id }, select: { razorpayCustomerId: true } }),
      // Most recent webhook-driven payment event for this tenant, if any - gives a support admin
      // a "last payment status" without ever needing to see a Razorpay secret or raw webhook payload.
      prisma.billingAuditLog.findFirst({
        where: { tenantId: tenant.id, action: { startsWith: "WEBHOOK_PAYMENT_" } },
        orderBy: { createdAt: "desc" },
        select: { action: true, createdAt: true },
      }),
    ]);
    res.json({
      ...tenant,
      userCount,
      salespersonCount,
      customerCount,
      razorpayCustomerId: billingCustomer?.razorpayCustomerId ?? null,
      lastPaymentEvent: lastPaymentAudit ? { action: lastPaymentAudit.action, at: lastPaymentAudit.createdAt } : null,
    });
  })
);

router.get(
  "/tenants/:id/billing-audit-log",
  asyncHandler(async (req, res) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!tenant) return res.status(404).json({ error: "Not found" });

    const { page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const take = Math.min(parseInt(pageSize, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.billingAuditLog.findMany({
        where: { tenantId: req.params.id },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.billingAuditLog.count({ where: { tenantId: req.params.id } }),
    ]);
    res.json({ items, total, page: Number(page), pageSize: take });
  })
);

router.patch(
  "/tenants/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }).parse(req.body);
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) return res.status(404).json({ error: "Not found" });
    const updated = await prisma.tenant.update({ where: { id: req.params.id }, data: { status } });
    res.json(updated);
  })
);

router.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { monthlyPrice: "asc" } });
    res.json(plans);
  })
);

// Manual support override: lets a platform admin directly set a tenant's plan/status (e.g.
// comping an account, fixing a stuck subscription) alongside the normal Razorpay-driven path in
// services/razorpayWebhook.ts, which is what updates this same Subscription row for every real
// checkout/renewal/cancellation. This endpoint intentionally does not touch Razorpay itself, so
// using it on a tenant with a live razorpaySubscriptionId can desync local state from Razorpay's -
// prefer cancelling/adjusting the actual Razorpay subscription first for a tenant that has one.
router.patch(
  "/tenants/:id/subscription",
  asyncHandler(async (req, res) => {
    const { planKey, status, currentPeriodEnd } = z
      .object({
        planKey: z.string().optional(),
        status: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED", "SUSPENDED"]).optional(),
        currentPeriodEnd: z.string().optional().nullable(),
      })
      .parse(req.body);

    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) return res.status(404).json({ error: "Not found" });

    let planId: string | undefined;
    if (planKey) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { key: planKey } });
      if (!plan) return res.status(400).json({ error: "Unknown plan" });
      planId = plan.id;
    }

    const before = await prisma.subscription.findUnique({ where: { tenantId: req.params.id }, include: { plan: true } });

    const subscription = await prisma.subscription.update({
      where: { tenantId: req.params.id },
      data: {
        planId,
        status,
        currentPeriodEnd: currentPeriodEnd === undefined ? undefined : currentPeriodEnd ? new Date(currentPeriodEnd) : null,
      },
      include: { plan: true },
    });

    await recordBillingAudit({
      tenantId: req.params.id,
      actorType: "PLATFORM_ADMIN",
      actorId: req.platformAuth!.platformAdminId,
      action: "PLATFORM_SUBSCRIPTION_OVERRIDE",
      previousState: before ? { planKey: before.plan.key, status: before.status, currentPeriodEnd: before.currentPeriodEnd } : null,
      newState: { planKey: subscription.plan.key, status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd },
    });

    res.json(subscription);
  })
);

export default router;
