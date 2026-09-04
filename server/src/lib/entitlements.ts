import { prisma } from "./prisma";

export class PlanLimitError extends Error {
  status = 402;
  constructor(message: string) {
    super(message);
    this.name = "PlanLimitError";
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
