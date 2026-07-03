-- API keys are now full-access and independent of their creator: make the
-- creator link nullable and set it to NULL when the creating user is deleted
-- (instead of cascade-deleting the key).

-- DropForeignKey
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_createdBy_fkey";

-- AlterTable
ALTER TABLE "api_keys" ALTER COLUMN "createdBy" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
