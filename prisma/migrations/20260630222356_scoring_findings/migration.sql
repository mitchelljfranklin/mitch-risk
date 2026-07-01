-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REMEDIATED', 'RISK_ACCEPTED');

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "responseId" TEXT,
    "controlCodes" TEXT[],
    "severity" "RiskWeight" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "findings_assessmentId_idx" ON "findings"("assessmentId");

-- CreateIndex
CREATE INDEX "findings_status_idx" ON "findings"("status");

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
