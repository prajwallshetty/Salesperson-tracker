import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Unauthenticated, read-only, and deliberately narrow: only the fields a public pricing page
// needs (name/price/limits/features), never tenant data, internal ids beyond the plan's own,
// or anything from Subscription/Tenant. This is the landing page's source of truth for pricing
// so marketing copy can never drift from what the backend actually enforces (see
// lib/entitlements.ts's assertCanAddSalesperson).
// Fixed tier order for display - Enterprise is priced "Contact Sales" (stored as 0, same as the
// internal LEGACY plan) so sorting by monthlyPrice would incorrectly put it first.
const PUBLIC_PLAN_ORDER = ["STARTER", "GROWTH", "PROFESSIONAL", "BUSINESS", "SCALE", "ENTERPRISE"];

router.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true, key: { in: PUBLIC_PLAN_ORDER } },
      select: {
        key: true,
        name: true,
        monthlyPrice: true,
        annualPrice: true,
        maxSalespersons: true,
        maxAdmins: true,
        features: true,
      },
    });
    const byKey = new Map(plans.map((p) => [p.key, p]));
    res.json(PUBLIC_PLAN_ORDER.map((key) => byKey.get(key)).filter(Boolean));
  })
);

export default router;
