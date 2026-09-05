-- Owner/Super Admin dashboard support: additive only.

-- Track last successful tenant-user login, for the platform Users table and tenant
-- "recent logins" activity view. Nullable - existing rows simply have no value yet.
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Speeds up "upcoming renewals" queries (WHERE currentPeriodEnd BETWEEN now AND now+30d)
-- across all tenants without a full table scan.
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");
