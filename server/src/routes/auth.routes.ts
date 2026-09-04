import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { comparePassword, hashPassword, signToken } from "../lib/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, AUTH_COOKIE_NAME } from "../middleware/auth";
import { generateUniqueTenantSlug } from "../lib/slug";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// 30 days, matching the JWT's own expiry (see lib/auth.ts signToken).
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// In local dev, admin-web (:5173) and sales-app (:5174) both talk to the backend on
// localhost:4000 - browsers treat different localhost ports as the same site for SameSite
// purposes, so sameSite:"lax" (which doesn't require HTTPS) works fine there.
//
// In production the two frontends and the API are near-certainly on genuinely different
// registrable domains (separate Vercel projects / a separate backend host) - this is a
// cross-site relationship, and SameSite=Lax cookies are NOT sent on cross-site fetch/XHR
// requests at all (only on top-level navigations). That means login would appear to
// succeed (the cookie gets set) while every subsequent API call silently arrives with no
// cookie, producing exactly the "login works but nothing after it does", "logout is
// unreliable", "insufficient access" symptoms this was tracked down to fix. Production
// therefore always uses sameSite:"none" (which requires secure:true - satisfied since
// production is HTTPS) - this is also correct/harmless for a same-site deployment, so
// there's no need to detect same-site vs. cross-site, just to distinguish dev from prod.
function cookieOptions() {
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
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { salesperson: true, tenant: { select: { status: true } } },
    });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    if (!user.isActive) return res.status(401).json({ error: "Account is deactivated" });
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });
    if (user.tenant.status === "SUSPENDED") {
      return res.status(403).json({ error: "This workspace is suspended. Contact your administrator." });
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      salespersonId: user.salesperson?.id,
      tenantId: user.tenantId,
    });

    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        salespersonId: user.salesperson?.id ?? null,
        salespersonStatus: user.salesperson?.status ?? null,
        tenantId: user.tenantId,
      },
    });
  })
);

const signupSchema = z.object({
  companyName: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const TRIAL_DAYS = 14;

// New-company onboarding: creates a Tenant, its first ADMIN user (the workspace owner), and a
// starter-plan trial subscription in one step, then signs the owner straight in (same cookie
// mechanism as /login). This is the only place a Tenant row is created outside the multi-tenancy
// backfill migration - every other endpoint only ever operates within an existing tenantId.
router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const data = signupSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: "Email already in use" });

    const starterPlan = await prisma.subscriptionPlan.findUnique({ where: { key: "STARTER" } });
    if (!starterPlan) {
      // Only possible if the plan catalog seed (see the multi-tenancy migration) was never
      // applied - a genuine server misconfiguration, not a user-facing validation error.
      throw new Error("STARTER plan is not configured");
    }

    const slug = await generateUniqueTenantSlug(data.companyName);
    const passwordHash = await hashPassword(data.password);
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { user, tenant } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: data.companyName, slug, status: "ACTIVE" } });
      const user = await tx.user.create({
        data: { tenantId: tenant.id, name: data.name, email, passwordHash, role: "ADMIN" },
      });
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: starterPlan.id,
          status: "TRIALING",
          billingProvider: "manual",
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
        },
      });
      return { user, tenant };
    });

    const token = signToken({ userId: user.id, role: "ADMIN", tenantId: tenant.id });
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        salespersonId: null,
        salespersonStatus: null,
        tenantId: tenant.id,
      },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    });
  })
);

const accessCodeLoginSchema = z.object({
  accessCode: z.string().trim().min(1),
});

router.post(
  "/access-code-login",
  asyncHandler(async (req, res) => {
    const { accessCode } = accessCodeLoginSchema.parse(req.body);
    // Codes are generated upper-case (see lib/accessCode.ts); normalize input the same
    // way so a salesperson typing lowercase on a phone keyboard isn't rejected.
    const normalized = accessCode.toUpperCase();

    const salesperson = await prisma.salesperson.findUnique({
      where: { accessCode: normalized },
      include: { user: { include: { tenant: { select: { status: true } } } } },
    });

    // Same generic message whether the code doesn't exist, is disabled, the account is
    // deactivated, or the tenant is suspended - never reveal which of those is true to an
    // unauthenticated caller.
    const invalid = () => res.status(401).json({ error: "Invalid access code" });
    if (!salesperson || !salesperson.accessCodeEnabled) return invalid();
    if (!salesperson.user.isActive || salesperson.status !== "ACTIVE") return invalid();
    if (salesperson.user.tenant.status === "SUSPENDED") return invalid();

    // Identity is derived entirely server-side from the matched record - the client never
    // supplies a salespersonId/userId/tenantId/role that gets trusted.
    const token = signToken({
      userId: salesperson.user.id,
      role: salesperson.user.role,
      salespersonId: salesperson.id,
      tenantId: salesperson.tenantId,
    });

    await prisma.salesperson.update({ where: { id: salesperson.id }, data: { accessCodeLastUsedAt: new Date() } });

    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions());
    res.json({
      user: {
        id: salesperson.user.id,
        name: salesperson.user.name,
        email: salesperson.user.email,
        role: salesperson.user.role,
        avatarUrl: salesperson.user.avatarUrl,
        salespersonId: salesperson.id,
        salespersonStatus: salesperson.status,
        tenantId: salesperson.tenantId,
      },
    });
  })
);

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    // Must match the attributes the cookie was set with (sameSite/secure especially) or
    // the browser won't recognize it as the same cookie and silently keeps it around.
    res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
    res.status(204).end();
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { salesperson: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      salespersonId: user.salesperson?.id ?? null,
      salespersonStatus: user.salesperson?.status ?? null,
      tenantId: user.tenantId,
    });
  })
);

export default router;
