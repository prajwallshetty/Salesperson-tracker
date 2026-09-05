import { Request, Response, NextFunction } from "express";
import { prisma } from "./prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { FEATURE_CATALOG } from "./featureEntitlements";

const FEATURE_LABELS = new Map(FEATURE_CATALOG.map((f) => [f.key, f.label]));

export class PlanLimitError extends Error {
  status = 402;
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export class SubscriptionRequiredError extends Error {
  status = 402;
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionRequiredError";
  }
}

function humanizeFeatureKey(feature: string): string {
  // Feature keys are the UPPER_SNAKE_CASE entitlement constants in lib/featureEntitlements.ts -
  // prefer that catalog's human label; fall back to a simple underscore-to-space/lowercase
  // rendering for a key that isn't in the catalog (shouldn't normally happen).
  return FEATURE_LABELS.get(feature)?.toLowerCase() ?? feature.replace(/_/g, " ").toLowerCase();
}

export class FeatureNotAvailableError extends Error {
  status = 403;
  constructor(feature: string, planName: string) {
    super(`${humanizeFeatureKey(feature)} is not included in your ${planName} plan. Upgrade your plan to use this feature.`);
    this.name = "FeatureNotAvailableError";
  }
}

/**
 * Loads a tenant's active subscription + plan. Every tenant has exactly one Subscription row
 * (created at signup, or by the multi-tenancy backfill migration for pre-existing data) - a
 * missing row here means the tenant/subscription data is corrupt, not a normal "no plan yet"
 * state, so this throws rather than silently falling back to an unlimited default.
 */
export async function getTenantSubscription(tenantId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });
  if (!subscription) throw new Error(`Tenant ${tenantId} has no subscription`);
  return subscription;
}

/**
 * Enforced server-side, not just hidden in the UI: called from the one place a Salesperson
 * (and its linked User) row is created (services/accounts.ts) before any database write, so a
 * tenant can never end up with more active salespeople than its plan allows regardless of which
 * client/endpoint is used.
 */
export async function assertCanAddSalesperson(tenantId: string) {
  const subscription = await getTenantSubscription(tenantId);
  const currentCount = await prisma.salesperson.count({ where: { tenantId, status: "ACTIVE" } });
  if (currentCount >= subscription.plan.maxSalespersons) {
    throw new PlanLimitError(
      `You've reached your plan limit. Current plan: ${subscription.plan.name}. Limit: ${subscription.plan.maxSalespersons} salespersons.`
    );
  }
}

/**
 * Feature flags are stored as a flat JSON map on SubscriptionPlan.features (see
 * prisma/migrations/20260904090000_add_multi_tenancy for the seeded plan catalog) and checked
 * here instead of at each call site, so a plan's feature set can change without touching route
 * code. Missing/malformed data fails safe (feature disabled) rather than defaulting to enabled.
 */
export async function hasFeature(tenantId: string, feature: string): Promise<boolean> {
  const subscription = await getTenantSubscription(tenantId);
  const features = subscription.plan.features;
  if (features && typeof features === "object" && !Array.isArray(features)) {
    return Boolean((features as Record<string, unknown>)[feature]);
  }
  return false;
}

// TRIALING/ACTIVE/PAST_DUE all still get paid functionality - PAST_DUE is Razorpay's own retry
// window on a failed charge (see subscriptionStatusMap.ts), not an immediate cutoff, matching
// how most subscription billing products give a grace period rather than an instant lockout.
// CANCELLED/EXPIRED/SUSPENDED do not - see requireActiveSubscription below for the messages
// shown for each.
const USABLE_STATUSES = new Set(["TRIALING", "ACTIVE", "PAST_DUE"]);

function subscriptionBlockedMessage(status: string): string {
  switch (status) {
    case "EXPIRED":
      return "Your trial has expired. Choose a plan to continue.";
    case "CANCELLED":
      return "Your subscription has been cancelled. Reactivate to continue.";
    case "SUSPENDED":
      return "Your subscription needs attention. Contact billing to restore access.";
    default:
      return "Subscription required.";
  }
}

/**
 * Centralized subscription/entitlement middleware (task requirement: "Do not duplicate
 * subscription checks in every API route"). Composed as
 * requireAuth -> requireActiveSubscription()/requireFeature(...) -> route handler.
 * Deliberately does NOT block GET-only account/billing endpoints - a tenant on an expired
 * subscription must still be able to see their own billing status and upgrade, per the task's
 * "never lock a tenant out of Billing/Settings" rule; call this only on routes that represent
 * paid product functionality, not on the billing routes themselves.
 */
export function requireActiveSubscription() {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const subscription = await getTenantSubscription(req.auth!.tenantId);
    if (!USABLE_STATUSES.has(subscription.status)) {
      throw new SubscriptionRequiredError(subscriptionBlockedMessage(subscription.status));
    }
    next();
  });
}

/** Gates one named feature (see SubscriptionPlan.features) behind the tenant's plan. */
export function requireFeature(feature: string) {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const subscription = await getTenantSubscription(req.auth!.tenantId);
    if (!USABLE_STATUSES.has(subscription.status)) {
      throw new SubscriptionRequiredError(subscriptionBlockedMessage(subscription.status));
    }
    const features = subscription.plan.features;
    const enabled =
      features && typeof features === "object" && !Array.isArray(features)
        ? Boolean((features as Record<string, unknown>)[feature])
        : false;
    if (!enabled) throw new FeatureNotAvailableError(feature, subscription.plan.name);
    next();
  });
}

/**
 * Express-middleware form of assertCanAddSalesperson, for any future salesperson-creation route
 * that doesn't go through services/accounts.ts (which already calls the function form directly).
 */
export function requirePlanLimit(resource: "salespersons") {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (resource === "salespersons") {
      await assertCanAddSalesperson(req.auth!.tenantId);
    }
    next();
  });
}
