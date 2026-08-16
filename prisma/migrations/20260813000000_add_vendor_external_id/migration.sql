-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "vendors_externalId_key" ON "vendors"("externalId");
