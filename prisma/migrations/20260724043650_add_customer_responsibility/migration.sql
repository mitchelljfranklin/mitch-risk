-- CreateEnum
CREATE TYPE "CustomerResponsibilityStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE');

-- AlterTable
ALTER TABLE "controls" ADD COLUMN     "isSharedResponsibility" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "customer_responsibility_actions" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "certificationId" TEXT,
    "controlCode" TEXT NOT NULL,
    "frameworkName" TEXT NOT NULL,
    "controlTitle" TEXT NOT NULL,
    "status" "CustomerResponsibilityStatus" NOT NULL DEFAULT 'PENDING',
    "assignedToId" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_responsibility_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_responsibility_actions_vendorId_idx" ON "customer_responsibility_actions"("vendorId");

-- CreateIndex
CREATE INDEX "customer_responsibility_actions_vendorId_status_idx" ON "customer_responsibility_actions"("vendorId", "status");

-- CreateIndex
CREATE INDEX "customer_responsibility_actions_assignedToId_idx" ON "customer_responsibility_actions"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_responsibility_actions_vendorId_certificationId_co_key" ON "customer_responsibility_actions"("vendorId", "certificationId", "controlCode");

-- AddForeignKey
ALTER TABLE "customer_responsibility_actions" ADD CONSTRAINT "customer_responsibility_actions_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_responsibility_actions" ADD CONSTRAINT "customer_responsibility_actions_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "vendor_certifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_responsibility_actions" ADD CONSTRAINT "customer_responsibility_actions_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
