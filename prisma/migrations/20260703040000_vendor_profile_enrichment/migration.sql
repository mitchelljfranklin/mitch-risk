-- Vendor profile enrichment: risk owner, data sensitivity, service description,
-- and contract renewal date.

-- CreateEnum
CREATE TYPE "DataSensitivity" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "contractRenewalDate" TIMESTAMP(3),
ADD COLUMN     "dataSensitivity" "DataSensitivity",
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "serviceDescription" TEXT;

-- CreateIndex
CREATE INDEX "vendors_ownerId_idx" ON "vendors"("ownerId");

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
