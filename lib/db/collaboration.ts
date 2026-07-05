import { prisma } from "@/lib/prisma";
import { expiryFromNow } from "@/lib/tokens";

export function listComments(
  assessmentId: string,
  assessmentQuestionId?: string,
) {
  return prisma.comment.findMany({
    where: {
      assessmentId,
      assessmentQuestionId: assessmentQuestionId ?? null,
    },
    orderBy: { createdAt: "asc" },
  });
}

export function addComment(input: {
  assessmentId: string;
  assessmentQuestionId?: string;
  parentId?: string;
  authorType: string;
  authorName: string;
  body: string;
  visibility?: string;
}) {
  return prisma.comment.create({
    data: { ...input, visibility: input.visibility ?? "INTERNAL" },
  });
}

export function getReviewsByAssessment(assessmentId: string) {
  return prisma.answerReview.findMany({
    where: { response: { assessmentId } },
    include: { response: { select: { assessmentQuestionId: true } } },
  });
}

export function setReviewDecision(params: {
  responseId: string;
  reviewerId: string;
  decision: string;
  note?: string;
}) {
  return prisma.answerReview.upsert({
    where: { responseId: params.responseId },
    update: {
      decision: params.decision,
      note: params.note ?? null,
      reviewerId: params.reviewerId,
    },
    create: {
      responseId: params.responseId,
      decision: params.decision,
      note: params.note ?? null,
      reviewerId: params.reviewerId,
    },
  });
}

export function markUnderReview(assessmentId: string) {
  return prisma.assessment.updateMany({
    where: { id: assessmentId, status: "SUBMITTED" },
    data: { status: "UNDER_REVIEW" },
  });
}

export async function sendBackToVendor(
  assessmentId: string,
  tokenDays = 30,
): Promise<void> {
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      status: "IN_PROGRESS",
      tokenExpiresAt: expiryFromNow(tokenDays),
    },
  });
}

export function reopenReview(assessmentId: string) {
  return prisma.assessment.update({
    where: { id: assessmentId },
    data: { status: "UNDER_REVIEW" },
  });
}

export async function finalizeAssessment(
  assessmentId: string,
): Promise<{ ok: boolean; missing: number }> {
  const responses = await prisma.response.findMany({
    where: { assessmentId, isNotApplicable: false },
    include: { review: true },
  });

  const unreviewed = responses.filter(
    (response) => !response.review || response.review.decision !== "APPROVED",
  ).length;

  if (unreviewed > 0) {
    return { ok: false, missing: unreviewed };
  }

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { status: "COMPLETED" },
  });

  return { ok: true, missing: 0 };
}
