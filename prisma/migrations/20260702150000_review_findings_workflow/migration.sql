-- FindingStatus: retire ACCEPTED (map existing rows to RISK_ACCEPTED), then
-- swap the enum type to the new 3-value set.
UPDATE "findings" SET "status" = 'RISK_ACCEPTED' WHERE "status" = 'ACCEPTED';

ALTER TYPE "FindingStatus" RENAME TO "FindingStatus_old";
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'REMEDIATED', 'RISK_ACCEPTED');
ALTER TABLE "findings"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "FindingStatus" USING ("status"::text::"FindingStatus"),
  ALTER COLUMN "status" SET DEFAULT 'OPEN';
DROP TYPE "FindingStatus_old";

-- Finding resolution audit fields
ALTER TABLE "findings" ADD COLUMN "resolutionNote" TEXT;
ALTER TABLE "findings" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "findings" ADD COLUMN "resolvedById" TEXT;
CREATE INDEX "findings_resolvedById_idx" ON "findings"("resolvedById");
ALTER TABLE "findings" ADD CONSTRAINT "findings_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Persist the recipients an assessment invite was sent to (vendor or custom)
ALTER TABLE "assessments" ADD COLUMN "portalRecipients" TEXT[];
