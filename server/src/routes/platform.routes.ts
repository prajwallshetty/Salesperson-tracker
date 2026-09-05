import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { comparePassword, hashPassword, signPlatformToken, signToken } from "../lib/auth";
import { requirePlatformAuth, PLATFORM_AUTH_COOKIE_NAME } from "../middleware/platformAuth";
import { AUTH_COOKIE_NAME } from "../middleware/auth";
import { recordBillingAudit } from "../services/billingAudit";
import { authRateLimit } from "../middleware/rateLimit";
import { generateUniqueTenantSlug } from "../lib/slug";

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
    const { search, status, subscriptionStatus, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: any = {};
    if (status) where.status = status;
    if (subscriptionStatus) where.subscription = { is: { status: subscriptionStatus } };
    if (search) {
      // A single search box covering company name, tenant ID (exact), and admin email (via the
      // owning User row) - matches the spec's "Search: Company / Email / Tenant ID" requirement
      // without three separate inputs.
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { id: search },
        { users: { some: { email: { contains: search, mode: "insensitive" } } } },
      ];
    }
    const take = Math.min(parseInt(pageSize, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [items, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { users: true } },
          users: { where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, take: 1, select: { name: true, email: true } },
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
        admin: t.users[0] ? { name: t.users[0].name, email: t.users[0].email } : null,
        subscription: t.subscription
          ? {
              status: t.subscription.status,
              planName: t.subscription.plan.name,
              planKey: t.subscription.plan.key,
              trialEnd: t.subscription.trialEnd,
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

const createTenantSchema = z.object({
  companyName: z.string().min(1),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only").optional(),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPhone: z.string().optional(),
  planKey: z.string().min(1),
  billingInterval: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  trialDays: z.number().int().min(0).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
});

// Manual tenant creation for support/sales-assisted onboarding - the normal path is still
// self-serve /api/auth/signup; this exists for cases like a phone/email signup the Owner is
// setting up on the customer's behalf. Every value (plan, interval, trial length) is resolved
// and validated server-side from the request body and the DB plan catalog - never trusted as
// pre-computed pricing, exactly like the self-serve signup/checkout path.
router.post(
  "/tenants",
  asyncHandler(async (req, res) => {
    const data = createTenantSchema.parse(req.body);
    const email = data.adminEmail.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: "A user with this email already exists" });

    const plan = await prisma.subscriptionPlan.findUnique({ where: { key: data.planKey.toUpperCase() } });
    if (!plan || !plan.isActive) return res.status(400).json({ error: "Unknown or inactive plan" });

    if (data.slug) {
      const slugTaken = await prisma.tenant.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (slugTaken) return res.status(409).json({ error: "This workspace slug is already taken" });
    }
    const slug = data.slug ?? (await generateUniqueTenantSlug(data.companyName));

    // A one-time, owner-visible temporary password - there is no email-sending integration in
    // this codebase to deliver it automatically, so the Owner is expected to relay it to the
    // customer through their own channel. It is hashed exactly like any self-serve password
    // before being stored, and never persisted or logged in plaintext beyond this response.
    const tempPassword = crypto.randomBytes(9).toString("base64url");
    const passwordHash = await hashPassword(tempPassword);

    const now = new Date();
    const trialDays = data.trialDays ?? plan.trialDays;
    const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : now;

    const { tenant } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: data.companyName, slug, status: data.status } });
      await tx.user.create({
        data: { tenantId: tenant.id, name: data.adminName, email, phone: data.adminPhone, passwordHash, role: "ADMIN" },
      });
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: trialDays > 0 ? "TRIALING" : "ACTIVE",
          billingProvider: "manual",
          billingInterval: data.billingInterval,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialStart: trialDays > 0 ? now : null,
          trialEnd: trialDays > 0 ? trialEnd : null,
        },
      });
      return { tenant };
    });

    await recordBillingAudit({
      tenantId: tenant.id,
      actorType: "PLATFORM_ADMIN",
      actorId: req.platformAuth!.platformAdminId,
      action: "TENANT_CREATED",
      newState: { companyName: data.companyName, planKey: plan.key, createdVia: "owner_dashboard" },
    });

    res.status(201).json({ tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }, adminEmail: email, tempPassword });
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
    const [userCount, salespersonCount, customerCount, leadCount, visitCount, orderCount, collectionCount, billingCustomer, lastPaymentAudit, adminUser] =
      await Promise.all([
        prisma.user.count({ where: { tenantId: tenant.id } }),
        prisma.salesperson.count({ where: { tenantId: tenant.id } }),
        prisma.customer.count({ where: { tenantId: tenant.id } }),
        prisma.lead.count({ where: { tenantId: tenant.id } }),
        prisma.visit.count({ where: { tenantId: tenant.id } }),
        prisma.order.count({ where: { tenantId: tenant.id } }),
        prisma.collection.count({ where: { tenantId: tenant.id } }),
        prisma.billingCustomer.findUnique({ where: { tenantId: tenant.id }, select: { razorpayCustomerId: true } }),
        // Most recent webhook-driven payment event for this tenant, if any - gives a support admin
        // a "last payment status" without ever needing to see a Razorpay secret or raw webhook payload.
        prisma.billingAuditLog.findFirst({
          where: { tenantId: tenant.id, action: { startsWith: "WEBHOOK_PAYMENT_" } },
          orderBy: { createdAt: "desc" },
          select: { action: true, createdAt: true },
        }),
        prisma.user.findFirst({ where: { tenantId: tenant.id, role: "ADMIN" }, orderBy: { createdAt: "asc" }, select: { name: true, email: true } }),
      ]);
    res.json({
      ...tenant,
      userCount,
      salespersonCount,
      customerCount,
      leadCount,
      visitCount,
      orderCount,
      collectionCount,
      admin: adminUser,
      razorpayCustomerId: billingCustomer?.razorpayCustomerId ?? null,
      lastPaymentEvent: lastPaymentAudit ? { action: lastPaymentAudit.action, at: lastPaymentAudit.createdAt } : null,
    });
  })
);

const IMPERSONATION_COOKIE_MAX_AGE_MS = 20 * 60 * 1000;

function tenantCookieOptions(maxAgeMs: number) {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    maxAge: maxAgeMs,
    path: "/",
  };
}

// "Login as tenant" - mints a short-lived (20 minute), audited tenant session as the tenant's
// own ADMIN user. Never accepts a userId/tenantId/role from the request body: the only input is
// which tenant and why, everything about the resulting identity is looked up server-side. The
// separate sg_platform_token cookie (this very request's own auth) is left completely untouched,
// so the Owner's platform session survives for the whole time they're impersonating and after
// they end it.
router.post(
  "/tenants/:id/impersonate",
  asyncHandler(async (req, res) => {
    const { reason } = z.object({ reason: z.string().trim().min(3, "A short reason is required") }).parse(req.body);

    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) return res.status(404).json({ error: "Not found" });
    if (tenant.status === "SUSPENDED") {
      return res.status(409).json({ error: "This tenant is suspended. Activate it before impersonating." });
    }

    const targetUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: "ADMIN", isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (!targetUser) return res.status(404).json({ error: "This tenant has no active admin user to impersonate" });

    const token = signToken(
      { userId: targetUser.id, role: "ADMIN", tenantId: tenant.id, impersonatedBy: req.platformAuth!.platformAdminId },
      { expiresIn: "20m" }
    );

    await recordBillingAudit({
      tenantId: tenant.id,
      actorType: "PLATFORM_ADMIN",
      actorId: req.platformAuth!.platformAdminId,
      action: "IMPERSONATION_STARTED",
      newState: { impersonatedUserId: targetUser.id, impersonatedUserEmail: targetUser.email, reason },
    });

    res.cookie(AUTH_COOKIE_NAME, token, tenantCookieOptions(IMPERSONATION_COOKIE_MAX_AGE_MS));
    res.json({ ok: true, tenantName: tenant.name });
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
    if (tenant.status !== status) {
      await recordBillingAudit({
        tenantId: tenant.id,
        actorType: "PLATFORM_ADMIN",
        actorId: req.platformAuth!.platformAdminId,
        action: status === "SUSPENDED" ? "TENANT_SUSPENDED" : "TENANT_ACTIVATED",
        previousState: { status: tenant.status },
        newState: { status },
      });
    }
    res.json(updated);
  })
);

router.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    // Platform-admin management view - unlike /api/public/plans (tenant/landing-page-facing,
    // active plans only), this includes inactive plans too so one can be reactivated or a
    // freshly-created plan reviewed before activating it.
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { displayOrder: "asc" } });
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
