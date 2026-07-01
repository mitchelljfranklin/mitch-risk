-- DropIndex
DROP INDEX IF EXISTS "notification_logs_assessmentId_type_sentTo_key";

-- AlterTable: make assessmentId nullable, change FK, add new columns
ALTER TABLE "notification_logs" DROP CONSTRAINT IF EXISTS "notification_logs_assessmentId_fkey";

ALTER TABLE "notification_logs"
  ALTER COLUMN "assessmentId" DROP NOT NULL,
  ADD COLUMN "subject" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SENT',
  ADD COLUMN "errorMessage" TEXT,
  ADD COLUMN "sentById" TEXT;

-- AddForeignKey for assessmentId (nullable)
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_assessmentId_fkey"
  FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for sentById
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_sentById_fkey"
  FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "notification_logs_assessmentId_type_sentTo_status_idx"
  ON "notification_logs"("assessmentId", "type", "sentTo", "status");

-- CreateIndex
CREATE INDEX "notification_logs_sentById_idx" ON "notification_logs"("sentById");

-- CreateIndex
CREATE INDEX "notification_logs_sentAt_idx" ON "notification_logs"("sentAt");
