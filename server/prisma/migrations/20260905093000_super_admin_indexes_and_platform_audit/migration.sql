-- Additive: new indexes only, plus relaxing one NOT NULL constraint. Nothing dropped, no data
-- touched, no existing row invalidated - every existing BillingAuditLog row already has a
-- non-null tenantId, so this only widens what's allowed going forward.

-- Support Super Admin dashboard/analytics/tenant-detail queries that filter by these columns.
CREATE INDEX "Subscription_providerSubscriptionId_idx" ON "Subscription"("providerSubscriptionId");
CREATE INDEX "Subscription_providerCustomerId_idx" ON "Subscription"("providerCustomerId");
CREATE INDEX "BillingEvent_createdAt_idx" ON "BillingEvent"("createdAt");
CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");

-- BillingAuditLog now also records platform-wide actions with no single owning tenant (e.g.
-- PLAN_CREATED/PLAN_UPDATED, which affect the global plan catalog rather than one tenant).
ALTER TABLE "BillingAuditLog" ALTER COLUMN "tenantId" DROP NOT NULL;
