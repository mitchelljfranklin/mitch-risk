-- CreateEnum
CREATE TYPE "ContractValue" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "GeographicRisk" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('ASSESSMENT_SUBMITTED', 'ASSESSMENT_OVERDUE', 'FINDING_CREATED', 'FINDING_RESOLVED', 'CERTIFICATION_EXPIRING');

-- AlterTable
ALTER TABLE "notification_logs" ALTER COLUMN "subject" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "contractValue" "ContractValue",
ADD COLUMN     "geographicRisk" "GeographicRisk";

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "events" "WebhookEvent"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);
