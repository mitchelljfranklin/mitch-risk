-- Remove OVERDUE from AssessmentStatus enum.
-- PostgreSQL does not support ALTER TYPE ... DROP VALUE directly, so we
-- recreate the type without the value and migrate the column.

BEGIN;

-- Step 1: Create replacement enum type without OVERDUE
CREATE TYPE "AssessmentStatus_new" AS ENUM (
  'DRAFT',
  'SENT',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'COMPLETED'
);

-- Step 2: Migrate the assessments table column to use the new type.
-- Cast through text: no row should have value 'OVERDUE' (overdue is
-- computed dynamically, never stored), but if any row does, the cast
-- will fail and alert us to a data issue.
ALTER TABLE "assessments"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "AssessmentStatus_new" USING ("status"::text::"AssessmentStatus_new"),
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Step 3: Drop the old enum
DROP TYPE "AssessmentStatus";

-- Step 4: Rename to original name
ALTER TYPE "AssessmentStatus_new" RENAME TO "AssessmentStatus";

COMMIT;
