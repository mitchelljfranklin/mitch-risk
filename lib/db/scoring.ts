import { computeTotalScore, scoreResponses } from "@/lib/scoring";
import { prisma } from "@/lib/prisma";
import { getScoringSettings } from "@/lib/settings";
import { dispatchWebhook } from "@/lib/webhooks";
import { type RiskWeight } from "../../prisma/generated/prisma/client";

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
  const newFindingIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    // Group responses by their identical result tuple so a whole assessment
    // is reconciled in a handful of updateMany statements instead of one
    // round-trip per answer (129+ on the full NIST questionnaire).
    const responseGroups = new Map<
      string,
      {
        ids: string[];
        data: {
          isCompliant: boolean | null;
          weightedScore: number;
          maxScore: number;
        };
      }
    >();
    for (const result of scored) {
      const key = `${result.isCompliant}|${result.weightedScore}|${result.maxScore}`;
      const group = responseGroups.get(key) ?? {
        ids: [],
        data: {
          isCompliant: result.isCompliant,
          weightedScore: result.weightedScore,
          maxScore: result.maxScore,
        },
      };
      group.ids.push(result.id);
      responseGroups.set(key, group);
    }
    for (const group of responseGroups.values()) {
      await tx.response.updateMany({
        where: { id: { in: group.ids } },
        data: group.data,
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

    const responseMap = new Map(
      assessment.responses.map((response) => [response.id, response]),
    );
    const questionMap = new Map(
      assessment.questions.map((question) => [question.id, question]),
    );

    const existingFindings = await tx.finding.findMany({
      where: { assessmentId, responseId: { in: nonCompliantResponseIds } },
      select: { id: true, responseId: true },
    });
    const findingByResponseId = new Map(
      existingFindings.map((finding) => [finding.responseId, finding.id]),
    );

    const preparedFindings: {
      responseId: string;
      existingId: string | null;
      data: {
        controlCodes: string[];
        severity: RiskWeight;
        title: string;
      };
    }[] = [];
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

      preparedFindings.push({
        responseId: result.id,
        existingId: findingByResponseId.get(result.id) ?? null,
        data: {
          controlCodes: question.controlIds
            .map((controlId) => controlCodeById.get(controlId))
            .filter((code): code is string => Boolean(code)),
          severity: question.riskWeight,
          title: question.text.slice(0, 100),
        },
      });
    }

    for (const finding of preparedFindings) {
      if (!finding.existingId) {
        continue;
      }
      await tx.finding.update({
        where: { id: finding.existingId },
        data: finding.data,
      });
    }

    const toCreate = preparedFindings.filter((finding) => !finding.existingId);
    if (toCreate.length > 0) {
      // Single statement instead of one create per non-compliant answer;
      // returned ids feed the FINDING_CREATED webhooks below.
      const created = await tx.finding.createManyAndReturn({
        data: toCreate.map((finding) => ({
          assessmentId,
          responseId: finding.responseId,
          ...finding.data,
          description:
            "The vendor's answer did not meet the expected response.",
        })),
        select: { id: true },
      });
      newFindingIds.push(...created.map((finding) => finding.id));
    }

    if (assessment.vendorId) {
      const aggregate = await tx.assessment.aggregate({
        where: {
          vendorId: assessment.vendorId,
          status: { notIn: ["DRAFT", "SENT", "IN_PROGRESS"] },
          score: { not: null },
        },
        _avg: { score: true },
        _max: { submittedAt: true },
      });
      await tx.vendor.update({
        where: { id: assessment.vendorId },
        data: {
          overallScore: aggregate._avg.score ?? null,
          lastAssessedAt: aggregate._max.submittedAt ?? null,
        },
      });
    }
  });

  if (newFindingIds.length > 0) {
    const assessmentWithVendor = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        title: true,
        vendor: { select: { id: true, name: true } },
      },
    });
    if (assessmentWithVendor) {
      const newFindings = await prisma.finding.findMany({
        where: { id: { in: newFindingIds } },
        select: { id: true, title: true, severity: true },
      });
      for (const finding of newFindings) {
        dispatchWebhook("FINDING_CREATED", {
          findingId: finding.id,
          findingTitle: finding.title,
          severity: finding.severity,
          assessmentId,
          assessmentTitle: assessmentWithVendor.title,
          vendorId: assessmentWithVendor.vendor.id,
          vendorName: assessmentWithVendor.vendor.name,
        });
      }
    }
  }
}
