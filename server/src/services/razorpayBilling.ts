import { prisma } from "../lib/prisma";
import { getRazorpay } from "../lib/razorpay";
import { recordBillingAudit } from "./billingAudit";
import type { BillingInterval } from "@prisma/client";

/**
 * Checkout-initiation side of the Razorpay integration (as opposed to services/billing.ts's
 * webhook-driven `applySubscriptionUpdate`, which is provider-agnostic by design). Everything
 * here talks to the Razorpay API directly and requires RAZORPAY_KEY_ID/KEY_SECRET to be set -
 * see lib/razorpay.ts. No live Razorpay account exists in this environment, so these calls are
 * untested against the real API; the payload shapes below follow Razorpay's documented
 * Customers/Subscriptions APIs current as of this writing - verify against
 * https://razorpay.com/docs/api/payments/subscriptions/ before relying on this in production,
 * since Razorpay does version these APIs over time.
 */

export class PlanNotConfiguredForRazorpayError extends Error {
  status = 409;
  constructor(planName: string, interval: BillingInterval) {
    super(`${planName} does not have a Razorpay ${interval.toLowerCase()} plan configured yet. Contact support.`);
    this.name = "PlanNotConfiguredForRazorpayError";
  }
}

/** One Razorpay customer per tenant, created once and reused for every subsequent checkout. */
export async function getOrCreateBillingCustomer(tenantId: string, email: string, name: string, phone?: string) {
  const existing = await prisma.billingCustomer.findUnique({ where: { tenantId } });
  if (existing) return existing;

  const razorpay = getRazorpay();
  const customer = await razorpay.customers.create({
    name,
    email,
    contact: phone,
    notes: { tenantId },
  });

  return prisma.billingCustomer.create({
    data: { tenantId, razorpayCustomerId: customer.id, email, name, phone },
  });
}

// Razorpay subscriptions require a total_count of billing cycles - there's no "bill forever"
// flag. A large-but-finite count is the documented way to emulate an indefinite subscription;
// picking 120 monthly cycles (10 years) / 10 yearly cycles means a genuinely long-lived tenant
// won't hit the ceiling in practice, and an admin can create a fresh subscription if one ever
// does (e.g. after 10+ years on the same plan).
const TOTAL_COUNT: Record<BillingInterval, number> = { MONTHLY: 120, YEARLY: 10 };

/**
 * Creates a Razorpay subscription for a tenant's chosen plan/interval and returns what the
 * frontend needs to open Razorpay Checkout. Does NOT change Subscription.status - that only
 * happens once the webhook confirms payment (see services/razorpayWebhook.ts). Safe to call
 * again before the customer completes checkout (e.g. they closed the modal); each call creates
 * a new Razorpay subscription object, so callers should not retry blindly after a successful
 * response.
 */
export async function createCheckoutSubscription(
  tenantId: string,
  planId: string,
  interval: BillingInterval,
  customer: { email: string; name: string; phone?: string }
) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw Object.assign(new Error("Plan not found"), { status: 404 });

  const razorpayPlanId = interval === "MONTHLY" ? plan.razorpayMonthlyPlanId : plan.razorpayYearlyPlanId;
  if (!razorpayPlanId) throw new PlanNotConfiguredForRazorpayError(plan.name, interval);

  const billingCustomer = await getOrCreateBillingCustomer(tenantId, customer.email, customer.name, customer.phone);

  const razorpay = getRazorpay();
  const subscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId,
    customer_notify: 1,
    total_count: TOTAL_COUNT[interval],
    notes: { tenantId, billingCustomerId: billingCustomer.id },
  });

  await recordBillingAudit({
    tenantId,
    actorType: "TENANT_ADMIN",
    action: "CHECKOUT_SUBSCRIPTION_CREATED",
    newState: { planId, interval, razorpaySubscriptionId: subscription.id },
  });

  return {
    razorpaySubscriptionId: subscription.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  };
}

/**
 * Cancels at Razorpay, then marks the local row `cancelAtPeriodEnd` (or immediately cancelled,
 * per `immediately`) - the subsequent `subscription.cancelled` webhook is what actually flips
 * Subscription.status to CANCELLED, keeping this consistent with "never trust the synchronous
 * response as the final word" even for cancellation.
 */
export async function cancelRazorpaySubscription(tenantId: string, immediately: boolean, actorId: string | null) {
  const subscription = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!subscription) throw Object.assign(new Error("Subscription not found"), { status: 404 });
  if (!subscription.providerSubscriptionId) {
    throw Object.assign(new Error("No active Razorpay subscription to cancel"), { status: 409 });
  }

  const razorpay = getRazorpay();
  await razorpay.subscriptions.cancel(subscription.providerSubscriptionId, immediately ? undefined : true);

  const updated = await prisma.subscription.update({
    where: { tenantId },
    data: {
      cancelAtPeriodEnd: !immediately,
      cancelledAt: new Date(),
    },
  });

  await recordBillingAudit({
    tenantId,
    actorType: "TENANT_ADMIN",
    actorId,
    action: "SUBSCRIPTION_CANCELLED",
    previousState: { cancelAtPeriodEnd: subscription.cancelAtPeriodEnd },
    newState: { cancelAtPeriodEnd: updated.cancelAtPeriodEnd, immediately },
  });

  return updated;
}
