import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { getTenantSubscription } from "../lib/entitlements";
import {
  createCheckoutSubscription,
  changeSubscriptionPlan,
  cancelRazorpaySubscription,
  PlanNotConfiguredForRazorpayError,
} from "../services/razorpayBilling";
import { recordBillingAudit } from "../services/billingAudit";
import { RazorpayNotConfiguredError } from "../lib/razorpay";
import { billingRateLimit } from "../middleware/rateLimit";

// The Razorpay webhook itself lives in razorpayWebhook.routes.ts, mounted in index.ts BEFORE
// the global express.json() parser - see that file's top comment for why it can't live on this
// router (which is mounted after express.json() and needs it for every other route here).

const router = Router();

router.use(requireAuth);

/** Maps the Razorpay-specific error types both /checkout and /cancel can throw to an HTTP response. */
function handleBillingError(err: unknown, res: import("express").Response) {
  if (err instanceof PlanNotConfiguredForRazorpayError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof RazorpayNotConfiguredError) {
    console.error(err);
    return res.status(err.status).json({ error: "Payments are temporarily unavailable. Please try again shortly or contact support." });
  }
  return null;
}

// ADMIN-only like the checkout/cancel routes below: this returns the tenant's plan, price,
// seat limit, usage and trial/renewal dates, which is workspace-owner information. The
// salesperson app never calls it - only admin-web's billing page does.
router.get(
  "/subscription",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const subscription = await getTenantSubscription(tenantId);
    const salespersonCount = await prisma.salesperson.count({ where: { tenantId, status: "ACTIVE" } });

    res.json({
      status: subscription.status,
      billingInterval: subscription.billingInterval,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: subscription.trialEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      cancelledAt: subscription.cancelledAt,
      plan: {
        key: subscription.plan.key,
        name: subscription.plan.name,
        monthlyPrice: subscription.plan.monthlyPrice,
        annualPrice: subscription.plan.annualPrice,
        maxSalespersons: subscription.plan.maxSalespersons,
        maxAdmins: subscription.plan.maxAdmins,
        features: subscription.plan.features,
      },
      usage: { salespersons: salespersonCount },
    });
  })
);

const checkoutSchema = z.object({
  planKey: z.string(),
  interval: z.enum(["MONTHLY", "YEARLY"]),
});

// Razorpay subscription states that still have a live, chargeable mandate at Razorpay - a plan
// switch from one of these goes through subscriptions.update() (see changeSubscriptionPlan),
// never a brand new checkout, or the tenant would end up with two concurrent Razorpay
// subscriptions and get billed twice.
const RAZORPAY_LIVE_STATUSES = new Set(["TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED"]);

router.post(
  "/checkout",
  requireRole("ADMIN"),
  billingRateLimit,
  asyncHandler(async (req, res) => {
    const tenantId = req.auth!.tenantId;
    const { planKey, interval } = checkoutSchema.parse(req.body);

    const plan = await prisma.subscriptionPlan.findUnique({ where: { key: planKey } });
    if (!plan || !plan.isActive) return res.status(404).json({ error: "Plan not found" });

    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const current = await getTenantSubscription(tenantId);
    const isPlanChangeOnLiveSubscription = Boolean(current.providerSubscriptionId) && RAZORPAY_LIVE_STATUSES.has(current.status);

    try {
      if (isPlanChangeOnLiveSubscription) {
        // Already has an authorized Razorpay mandate - change the plan on it directly, no new
        // checkout/payment popup needed (see changeSubscriptionPlan's own audit logging).
        const subscription = await changeSubscriptionPlan(tenantId, plan.id, interval, user.id);
        return res.json({ changed: true, subscription });
      }

      const checkout = await createCheckoutSubscription(tenantId, plan.id, interval, {
        email: user.email,
        name: user.name,
        phone: user.phone ?? undefined,
      });
      await recordBillingAudit({
        tenantId,
        actorType: "TENANT_ADMIN",
        actorId: user.id,
        action: "PLAN_SELECTED",
        newState: { planKey, interval },
      });
      res.json({ changed: false, ...checkout });
    } catch (err) {
      if (handleBillingError(err, res)) return;
      throw err;
    }
  })
);

const cancelSchema = z.object({
  immediately: z.boolean().default(false),
});

router.post(
  "/cancel",
  requireRole("ADMIN"),
  billingRateLimit,
  asyncHandler(async (req, res) => {
    const { immediately } = cancelSchema.parse(req.body);
    try {
      const subscription = await cancelRazorpaySubscription(req.auth!.tenantId, immediately, req.auth!.userId);
      res.json(subscription);
    } catch (err) {
      if (handleBillingError(err, res)) return;
      throw err;
    }
  })
);

export default router;
