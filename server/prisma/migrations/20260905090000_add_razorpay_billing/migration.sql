-- Additive Razorpay billing migration. Nothing existing is dropped, truncated, or deleted.
-- Extends SubscriptionPlan/Subscription with the fields needed for real billing-interval and
-- Razorpay-provider tracking, and adds three new tables (BillingCustomer, BillingEvent,
-- BillingAuditLog). Every new column on an existing table is added nullable-or-defaulted so
-- every current row (the "SalesForce Pro" legacy tenant and any tenants created since) keeps
-- working unchanged.

CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "AuditActorType" AS ENUM ('PLATFORM_ADMIN', 'TENANT_ADMIN', 'SYSTEM');

-- ============================================================================
-- SubscriptionPlan: description, trialDays, Razorpay plan-id mapping
-- ============================================================================
ALTER TABLE "SubscriptionPlan" ADD COLUMN "description" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "trialDays" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "razorpayMonthlyPlanId" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "razorpayYearlyPlanId" TEXT;

-- ============================================================================
-- Subscription: billing interval, trial window, cancellation timestamps
-- ============================================================================
ALTER TABLE "Subscription" ADD COLUMN "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "Subscription" ADD COLUMN "trialStart" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "trialEnd" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "endedAt" TIMESTAMP(3);

-- Backfill trialStart/trialEnd for any subscription currently TRIALING (the default plan's
-- trialDays at the time of this migration), so existing trials get a real end date instead of
-- an indefinite one.
UPDATE "Subscription" s
SET "trialStart" = s."currentPeriodStart",
    "trialEnd" = s."currentPeriodStart" + (COALESCE(p."trialDays", 14) || ' days')::interval
FROM "SubscriptionPlan" p
WHERE s."planId" = p."id" AND s."status" = 'TRIALING';

-- ============================================================================
-- New tables
-- ============================================================================

CREATE TABLE "BillingCustomer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "razorpayCustomerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingCustomer_tenantId_key" ON "BillingCustomer"("tenantId");
CREATE UNIQUE INDEX "BillingCustomer_razorpayCustomerId_key" ON "BillingCustomer"("razorpayCustomerId");
CREATE INDEX "BillingCustomer_tenantId_idx" ON "BillingCustomer"("tenantId");
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingEvent_eventId_key" ON "BillingEvent"("eventId");
CREATE INDEX "BillingEvent_eventType_idx" ON "BillingEvent"("eventType");
CREATE INDEX "BillingEvent_processed_idx" ON "BillingEvent"("processed");

CREATE TABLE "BillingAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "previousState" JSONB,
    "newState" JSONB,
    "providerEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BillingAuditLog_tenantId_createdAt_idx" ON "BillingAuditLog"("tenantId", "createdAt");
CREATE INDEX "BillingAuditLog_action_idx" ON "BillingAuditLog"("action");
