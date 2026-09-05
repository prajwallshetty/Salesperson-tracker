-- Additive: new enum, new table, new nullable/defaulted columns, new indexes only. Nothing
-- existing is dropped, altered destructively, or backfilled with fabricated data - a
-- FieldWorkSession row only ever exists for a shift that starts after this migration; historical
-- shifts before it have no session row, which is correct (there is no real data to reconstruct
-- one from).
--
-- Note: `prisma migrate diff` against the live database also proposes dropping and re-adding
-- Postgres-level FK constraints on tenantId for ~16 unrelated tables (Attendance, Category,
-- Customer, Visit, etc.) because those models intentionally declare tenantId as a bare scalar
-- with no Prisma `@relation` (see e.g. Salesperson.tenantId's own comment) while the live
-- database still carries FK constraints from an earlier migration. That drift is pre-existing and
-- unrelated to this change - intentionally NOT included here, since dropping those constraints
-- is out of scope for a GPS/field-work migration and needs its own deliberate review.

CREATE TYPE "FieldWorkSessionStatus" AS ENUM ('ACTIVE', 'ENDED');

CREATE TABLE "FieldWorkSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "status" "FieldWorkSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "startLatitude" DOUBLE PRECISION NOT NULL,
    "startLongitude" DOUBLE PRECISION NOT NULL,
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "totalDistanceMeters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldWorkSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FieldWorkSession_tenantId_idx" ON "FieldWorkSession"("tenantId");
CREATE INDEX "FieldWorkSession_salespersonId_status_idx" ON "FieldWorkSession"("salespersonId", "status");
CREATE INDEX "FieldWorkSession_salespersonId_startedAt_idx" ON "FieldWorkSession"("salespersonId", "startedAt");
ALTER TABLE "FieldWorkSession" ADD CONSTRAINT "FieldWorkSession_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LocationPing" ADD COLUMN "fieldWorkSessionId" TEXT;
ALTER TABLE "LocationPing" ADD COLUMN "flaggedSuspicious" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "LocationPing_fieldWorkSessionId_idx" ON "LocationPing"("fieldWorkSessionId");
ALTER TABLE "LocationPing" ADD CONSTRAINT "LocationPing_fieldWorkSessionId_fkey" FOREIGN KEY ("fieldWorkSessionId") REFERENCES "FieldWorkSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Visit" ADD COLUMN "checkInAccuracy" DOUBLE PRECISION;
ALTER TABLE "Visit" ADD COLUMN "checkInDistanceMeters" DOUBLE PRECISION;
ALTER TABLE "Visit" ADD COLUMN "checkInLocationValidated" BOOLEAN;
ALTER TABLE "Visit" ADD COLUMN "checkOutAccuracy" DOUBLE PRECISION;
CREATE INDEX "Visit_salespersonId_plannedAt_idx" ON "Visit"("salespersonId", "plannedAt");

CREATE INDEX "Attendance_tenantId_date_idx" ON "Attendance"("tenantId", "date");
