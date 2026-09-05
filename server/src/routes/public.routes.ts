import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { FEATURE_CATALOG } from "../lib/featureEntitlements";

const router = Router();

// Never shown on the public pricing page - LEGACY is an internal migration artifact, not a real
// sellable tier (Enterprise is the real "top" tier customers see, priced "Contact Sales").
const HIDDEN_PLAN_KEYS = new Set(["LEGACY"]);

// Unauthenticated, read-only, and deliberately narrow: only the fields a public pricing page
// needs (name/price/limits/features), never tenant data, internal ids beyond the plan's own,
// or anything from Subscription/Tenant. This is the landing page's source of truth for pricing
// so marketing copy can never drift from what the backend actually enforces (see
// lib/entitlements.ts's assertCanAddSalesperson). Ordered by the plan's own displayOrder column
// (set by a platform admin, see platformOps.routes.ts's plan CRUD) rather than monthlyPrice,
// since Enterprise is priced "Contact Sales" (stored as 0) and would otherwise sort first.
router.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      select: {
        key: true,
        name: true,
        description: true,
        monthlyPrice: true,
        annualPrice: true,
        maxSalespersons: true,
        maxAdmins: true,
        features: true,
        displayOrder: true,
      },
    });
    res.json(plans.filter((p) => !HIDDEN_PLAN_KEYS.has(p.key)));
  })
);

// The human label for every structured feature entitlement key (see lib/featureEntitlements.ts),
// in canonical display order - so landing-web/admin-web render feature checklists from this one
// place instead of each hard-coding their own copy of "GPS_TRACKING -> GPS Tracking" etc.
router.get(
  "/feature-catalog",
  asyncHandler(async (_req, res) => {
    res.json(FEATURE_CATALOG);
  })
);

export default router;
