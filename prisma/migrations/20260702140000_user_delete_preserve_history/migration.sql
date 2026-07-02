-- Preserve history when a user is deleted: audit logs and answer reviews keep
-- their records with a null author instead of cascading/blocking the delete.

-- AuditLog.userId -> nullable, FK ON DELETE SET NULL
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";
ALTER TABLE "audit_logs" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AnswerReview.reviewerId -> nullable, FK ON DELETE SET NULL
ALTER TABLE "answer_reviews" DROP CONSTRAINT "answer_reviews_reviewerId_fkey";
ALTER TABLE "answer_reviews" ALTER COLUMN "reviewerId" DROP NOT NULL;
ALTER TABLE "answer_reviews" ADD CONSTRAINT "answer_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
