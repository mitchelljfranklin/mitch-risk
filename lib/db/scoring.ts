import { computeTotalScore, scoreResponses } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";
import { getScoringSettings } from "@/lib/settings";

export async function scoreAssessment(assessmentId: string): Promise<void> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      questions: {
        select: {
          id: true,
          type: true,
          riskWeight: true,
          expectedAnswer: true,
          controlIds: true,
          text: true,
        },
      },
      responses: {
        select: {
          id: true,
          assessmentQuestionId: true,
          value: true,
          isNotApplicable: true,
        },
      },
    },
  });
  if (!assessment) {
    throw new Error("Assessment not found");
  }

  const scoringSettings = await getScoringSettings();

  const scored = scoreResponses(
    assessment.questions,
    assessment.responses,
    scoringSettings.riskWeights,
  );
  const totalScore = computeTotalScore(scored);

  await prisma.$transaction(async (tx) => {
    for (const result of scored) {
      await tx.response.update({
        where: { id: result.id },
        data: {
          isCompliant: result.isCompliant,
          weightedScore: result.weightedScore,
          maxScore: result.maxScore,
        },
      });
    }

    await tx.assessment.update({
      where: { id: assessmentId },
      data: { score: totalScore },
    });

    // Upsert findings keyed by responseId so reviewer-set status/notes survive
    // a rescore. Only auto-findings (those tied to a response) are reconciled;
    // manual findings (responseId = null) are left untouched.
    const nonCompliantResponseIds = scored
      .filter((result) => result.isCompliant === false)
      .map((result) => result.id);

    await tx.finding.deleteMany({
      where: {
        assessmentId,
        responseId: { not: null },
        NOT: { responseId: { in: nonCompliantResponseIds } },
      },
    });

    for (const result of scored) {
      if (result.isCompliant !== false) {
        continue;
      }
      const response = assessment.responses.find(
        (candidate) => candidate.id === result.id,
      );
      if (!response) {
        continue;
      }
      const question = assessment.questions.find(
        (candidate) => candidate.id === response.assessmentQuestionId,
      );
      if (!question) {
        continue;
      }

      const controlCodes = await tx.control.findMany({
        where: { id: { in: question.controlIds } },
        select: { code: true },
      });

      const existing = await tx.finding.findFirst({
        where: { assessmentId, responseId: result.id },
        select: { id: true },
      });

      const shared = {
        controlCodes: controlCodes.map((control) => control.code),
        severity: question.riskWeight,
        title: question.text.slice(0, 100),
      };

      if (existing) {
        // Preserve reviewer-managed status/resolutionNote/resolvedBy.
        await tx.finding.update({ where: { id: existing.id }, data: shared });
      } else {
        await tx.finding.create({
          data: {
            assessmentId,
            responseId: result.id,
            ...shared,
            description:
              "The vendor's answer did not meet the expected response.",
          },
        });
      }
    }

    const vendorRecord = await tx.assessment.findUnique({
      where: { id: assessmentId },
      select: { vendorId: true },
    });
    if (vendorRecord?.vendorId) {
      const aggregate = await tx.assessment.aggregate({
        where: {
          vendorId: vendorRecord.vendorId,
          status: { notIn: ["DRAFT", "SENT", "IN_PROGRESS"] },
          score: { not: null },
        },
        _avg: { score: true },
        _max: { submittedAt: true },
      });
      await tx.vendor.update({
        where: { id: vendorRecord.vendorId },
        data: {
          overallScore: aggregate._avg.score ?? null,
          lastAssessedAt: aggregate._max.submittedAt ?? null,
        },
      });
    }
  });
}
