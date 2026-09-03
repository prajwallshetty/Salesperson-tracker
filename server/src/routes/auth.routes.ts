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

// sameSite: "lax" works for local dev because admin-web (:5173) and sales-app (:5174) both talk
// to the backend on localhost:4000 - browsers treat different localhost ports as the same site
// for SameSite purposes. In the real deployment, if the two frontends and the API end up on
// genuinely different registrable domains (not just different ports/subdomains of one domain),
// this will need sameSite: "none" + secure: true instead, which also requires HTTPS on all three
// origins (browsers reject SameSite=None cookies over plain HTTP).
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
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

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
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
