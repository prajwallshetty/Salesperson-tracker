import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { comparePassword, signToken } from "../lib/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, AUTH_COOKIE_NAME } from "../middleware/auth";

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
      include: { salesperson: true },
    });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });
    if (!user.isActive) return res.status(401).json({ error: "Account is deactivated" });
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken({
      userId: user.id,
      role: user.role,
      salespersonId: user.salesperson?.id,
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
      },
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
      include: { user: true },
    });

    // Same generic message whether the code doesn't exist, is disabled, or the account is
    // deactivated - never reveal which of those is true to an unauthenticated caller.
    const invalid = () => res.status(401).json({ error: "Invalid access code" });
    if (!salesperson || !salesperson.accessCodeEnabled) return invalid();
    if (!salesperson.user.isActive || salesperson.status !== "ACTIVE") return invalid();

    // Identity is derived entirely server-side from the matched record - the client never
    // supplies a salespersonId/userId/role that gets trusted.
    const token = signToken({
      userId: salesperson.user.id,
      role: salesperson.user.role,
      salespersonId: salesperson.id,
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
    });
  })
);

export default router;
