-- Additive multi-tenancy migration.
--
-- Nothing existing is dropped, truncated, or deleted. This introduces the Tenant concept and
-- backfills every current row (there is currently exactly one organization's data in this
-- database) under a single "SalesForce Pro" tenant, so all existing users/salespersons/
-- customers/products/visits/orders/etc. keep working exactly as before. New tenants created
-- after this migration (via the signup flow) get their own tenantId and never see this or any
-- other tenant's rows.

-- ============================================================================
-- 1. New platform-level tables
-- ============================================================================

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'SUSPENDED');

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- Platform staff, deliberately separate from Tenant/User - see prisma/schema.prisma's
-- PlatformAdmin doc comment for why this is its own table rather than a User role.
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "annualPrice" DOUBLE PRECISION,
    "maxSalespersons" INTEGER NOT NULL,
    "maxAdmins" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SubscriptionPlan_key_key" ON "SubscriptionPlan"("key");

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "billingProvider" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- 2. Seed the plan catalog (real pricing tiers from the product spec, plus an internal
--    LEGACY plan reserved for the one pre-existing tenant backfilled below so its existing
--    8 salespeople are never blocked by a plan limit they never agreed to).
-- ============================================================================

INSERT INTO "SubscriptionPlan" ("id", "key", "name", "monthlyPrice", "annualPrice", "maxSalespersons", "maxAdmins", "features", "isActive", "updatedAt") VALUES
    ('plan_legacy',       'LEGACY',       'Legacy',       0,     NULL,  100000, 100, '{"gpsTracking":true,"liveTracking":true,"routeHistory":true,"reports":true,"targets":true,"territories":true,"quotations":true,"orders":true,"collections":true}', true, CURRENT_TIMESTAMP),
    ('plan_starter',      'STARTER',      'Starter',      3000,  30000, 5,      2,   '{"gpsTracking":true,"liveTracking":true,"routeHistory":false,"reports":false,"targets":true,"territories":false,"quotations":true,"orders":true,"collections":true}', true, CURRENT_TIMESTAMP),
    ('plan_growth',       'GROWTH',       'Growth',       5000,  50000, 10,     3,   '{"gpsTracking":true,"liveTracking":true,"routeHistory":true,"reports":false,"targets":true,"territories":true,"quotations":true,"orders":true,"collections":true}', true, CURRENT_TIMESTAMP),
    ('plan_professional', 'PROFESSIONAL', 'Professional', 9000,  90000, 25,     5,   '{"gpsTracking":true,"liveTracking":true,"routeHistory":true,"reports":true,"targets":true,"territories":true,"quotations":true,"orders":true,"collections":true}', true, CURRENT_TIMESTAMP),
    ('plan_business',     'BUSINESS',     'Business',     15000, 150000,50,     10,  '{"gpsTracking":true,"liveTracking":true,"routeHistory":true,"reports":true,"targets":true,"territories":true,"quotations":true,"orders":true,"collections":true}', true, CURRENT_TIMESTAMP),
    ('plan_scale',        'SCALE',        'Scale',        25000, 250000,100,    20,  '{"gpsTracking":true,"liveTracking":true,"routeHistory":true,"reports":true,"targets":true,"territories":true,"quotations":true,"orders":true,"collections":true}', true, CURRENT_TIMESTAMP),
    ('plan_enterprise',   'ENTERPRISE',   'Enterprise',   0,     NULL,  100000, 100, '{"gpsTracking":true,"liveTracking":true,"routeHistory":true,"reports":true,"targets":true,"territories":true,"quotations":true,"orders":true,"collections":true}', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- ============================================================================
-- 3. Backfill: one tenant owning every row that currently exists, plus a matching
--    subscription on the internal LEGACY plan so none of its existing functionality is
--    newly limited by the real plan tiers above.
-- ============================================================================

INSERT INTO "Tenant" ("id", "name", "slug", "status", "updatedAt")
VALUES ('tenant_legacy_default', 'SalesForce Pro', 'salesforce-pro', 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Subscription" ("id", "tenantId", "planId", "status", "billingProvider", "currentPeriodStart", "updatedAt")
VALUES ('sub_legacy_default', 'tenant_legacy_default', 'plan_legacy', 'ACTIVE', 'manual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId") DO NOTHING;

-- ============================================================================
-- 4. Add tenantId to every tenant-owned table: add nullable, backfill to the one existing
--    tenant, then tighten to NOT NULL + FK + index. Safe because every row in this database
--    today belongs to that single tenant.
-- ============================================================================

ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;
UPDATE "User" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

ALTER TABLE "Territory" ADD COLUMN "tenantId" TEXT;
UPDATE "Territory" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Territory" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Territory" ADD CONSTRAINT "Territory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Territory_tenantId_idx" ON "Territory"("tenantId");
DROP INDEX "Territory_name_key";
CREATE UNIQUE INDEX "Territory_tenantId_name_key" ON "Territory"("tenantId", "name");

ALTER TABLE "Salesperson" ADD COLUMN "tenantId" TEXT;
UPDATE "Salesperson" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Salesperson" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Salesperson" ADD CONSTRAINT "Salesperson_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Salesperson_tenantId_idx" ON "Salesperson"("tenantId");
DROP INDEX "Salesperson_employeeCode_key";
CREATE UNIQUE INDEX "Salesperson_tenantId_employeeCode_key" ON "Salesperson"("tenantId", "employeeCode");

ALTER TABLE "Customer" ADD COLUMN "tenantId" TEXT;
UPDATE "Customer" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Customer" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");

ALTER TABLE "Product" ADD COLUMN "tenantId" TEXT;
UPDATE "Product" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Product" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");
DROP INDEX "Product_sku_key";
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

ALTER TABLE "Category" ADD COLUMN "tenantId" TEXT;
UPDATE "Category" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Category" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");
DROP INDEX "Category_name_key";
CREATE UNIQUE INDEX "Category_tenantId_name_key" ON "Category"("tenantId", "name");

ALTER TABLE "PriceList" ADD COLUMN "tenantId" TEXT;
UPDATE "PriceList" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "PriceList" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PriceList_tenantId_idx" ON "PriceList"("tenantId");

ALTER TABLE "Target" ADD COLUMN "tenantId" TEXT;
UPDATE "Target" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Target" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Target" ADD CONSTRAINT "Target_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Target_tenantId_idx" ON "Target"("tenantId");

ALTER TABLE "Attendance" ADD COLUMN "tenantId" TEXT;
UPDATE "Attendance" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Attendance" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Attendance_tenantId_idx" ON "Attendance"("tenantId");

ALTER TABLE "LocationPing" ADD COLUMN "tenantId" TEXT;
UPDATE "LocationPing" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "LocationPing" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "LocationPing" ADD CONSTRAINT "LocationPing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "LocationPing_tenantId_idx" ON "LocationPing"("tenantId");

ALTER TABLE "Visit" ADD COLUMN "tenantId" TEXT;
UPDATE "Visit" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Visit" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Visit_tenantId_idx" ON "Visit"("tenantId");

ALTER TABLE "Lead" ADD COLUMN "tenantId" TEXT;
UPDATE "Lead" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Lead" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Lead_tenantId_idx" ON "Lead"("tenantId");

ALTER TABLE "FollowUp" ADD COLUMN "tenantId" TEXT;
UPDATE "FollowUp" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "FollowUp" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "FollowUp_tenantId_idx" ON "FollowUp"("tenantId");

ALTER TABLE "Quotation" ADD COLUMN "tenantId" TEXT;
UPDATE "Quotation" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Quotation" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Quotation_tenantId_idx" ON "Quotation"("tenantId");
DROP INDEX "Quotation_number_key";
CREATE UNIQUE INDEX "Quotation_tenantId_number_key" ON "Quotation"("tenantId", "number");

ALTER TABLE "Order" ADD COLUMN "tenantId" TEXT;
UPDATE "Order" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Order" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");
DROP INDEX "Order_number_key";
CREATE UNIQUE INDEX "Order_tenantId_number_key" ON "Order"("tenantId", "number");

ALTER TABLE "Collection" ADD COLUMN "tenantId" TEXT;
UPDATE "Collection" SET "tenantId" = 'tenant_legacy_default';
ALTER TABLE "Collection" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Collection_tenantId_idx" ON "Collection"("tenantId");
