-- CreateIndex
CREATE INDEX "assessments_vendorId_status_idx" ON "assessments"("vendorId", "status");

-- CreateIndex
CREATE INDEX "comments_assessmentId_assessmentQuestionId_idx" ON "comments"("assessmentId", "assessmentQuestionId");

-- CreateIndex
CREATE INDEX "responses_assessmentId_isCompliant_idx" ON "responses"("assessmentId", "isCompliant");
