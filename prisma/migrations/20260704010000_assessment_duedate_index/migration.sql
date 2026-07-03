-- Index dueDate for the frequent overdue/reminder queries that filter
-- assessments by dueDate (often combined with status).

-- CreateIndex
CREATE INDEX "assessments_dueDate_idx" ON "assessments"("dueDate");

-- CreateIndex
CREATE INDEX "assessments_status_dueDate_idx" ON "assessments"("status", "dueDate");
