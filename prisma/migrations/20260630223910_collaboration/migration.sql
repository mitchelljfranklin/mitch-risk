-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "assessmentQuestionId" TEXT,
    "parentId" TEXT,
    "authorType" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_reviews" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comments_assessmentId_idx" ON "comments"("assessmentId");

-- CreateIndex
CREATE INDEX "comments_assessmentQuestionId_idx" ON "comments"("assessmentQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "answer_reviews_responseId_key" ON "answer_reviews"("responseId");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_assessmentQuestionId_fkey" FOREIGN KEY ("assessmentQuestionId") REFERENCES "assessment_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_reviews" ADD CONSTRAINT "answer_reviews_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_reviews" ADD CONSTRAINT "answer_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
