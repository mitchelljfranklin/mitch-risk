-- Vendor certifications & attestations (SOC 2, ISO 27001, etc.) with expiry
-- tracking for point-in-time monitoring and renewal reminders.

-- CreateTable
CREATE TABLE "vendor_certifications" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT,
    "issuedDate" TIMESTAMP(3),
    "expiresDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_certifications_vendorId_idx" ON "vendor_certifications"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_certifications_expiresDate_idx" ON "vendor_certifications"("expiresDate");

-- AddForeignKey
ALTER TABLE "vendor_certifications" ADD CONSTRAINT "vendor_certifications_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
