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

  // Resolve every referenced control code in one query up front, rather than
  // one query per non-compliant response inside the transaction (N+1).
  const referencedControlIds = [
    ...new Set(assessment.questions.flatMap((question) => question.controlIds)),
  ];
  const controls =
    referencedControlIds.length > 0
      ? await prisma.control.findMany({
          where: { id: { in: referencedControlIds } },
          select: { id: true, code: true },
        })
      : [];
  const controlCodeById = new Map(
    controls.map((control) => [control.id, control.code]),
  );

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
        status: "OPEN",
        NOT: { responseId: { in: nonCompliantResponseIds } },
      },
    });

    const responseMap = new Map(assessment.responses.map((response) => [response.id, response]));
    const questionMap = new Map(assessment.questions.map((question) => [question.id, question]));

    const nonCompliantIds = scored
      .filter((result) => result.isCompliant === false)
      .map((result) => result.id);

    const existingFindings = await tx.finding.findMany({
      where: { assessmentId, responseId: { in: nonCompliantIds } },
      select: { id: true, responseId: true },
    });
    const findingByResponseId = new Map(
      existingFindings.map((finding) => [finding.responseId, finding.id]),
    );

    for (const result of scored) {
      if (result.isCompliant !== false) {
        continue;
      }
      const response = responseMap.get(result.id);
      if (!response) {
        continue;
      }
      const question = questionMap.get(response.assessmentQuestionId);
      if (!question) {
        continue;
      }

      const controlCodes = question.controlIds
        .map((controlId) => controlCodeById.get(controlId))
        .filter((code): code is string => Boolean(code));

      const existingId = findingByResponseId.get(result.id);

      const shared = {
        controlCodes,
        severity: question.riskWeight,
        title: question.text.slice(0, 100),
      };

      if (existingId) {
        await tx.finding.update({ where: { id: existingId }, data: shared });
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
