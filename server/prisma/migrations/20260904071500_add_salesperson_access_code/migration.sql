-- Additive migration: adds salesperson access-code login fields.
-- No existing columns/tables are altered or dropped, and no data is deleted.

ALTER TABLE "Salesperson" ADD COLUMN "accessCode" TEXT;
ALTER TABLE "Salesperson" ADD COLUMN "accessCodeEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Salesperson" ADD COLUMN "accessCodeLastUsedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Salesperson_accessCode_key" ON "Salesperson"("accessCode");
