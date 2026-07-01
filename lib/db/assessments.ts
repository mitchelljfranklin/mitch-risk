import { Prisma, type AssessmentStatus } from "@prisma/client";

import { getTemplateForBuilder } from "@/lib/db/templates";
import { copyJson } from "@/lib/json";
import { findMissingRequiredQuestions, type PortalAnswers } from "@/lib/portal";
import { scoreAssessment } from "@/lib/db/scoring";
import { prisma } from "@/lib/prisma";
import { type AssessmentInput } from "@/lib/schemas/assessment";
import { type SaveProgressInput } from "@/lib/schemas/portal";
import { expiryFromNow, generateAccessToken, hashToken } from "@/lib/tokens";

export type AssessmentFilters = {
  query?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
};

export function listAssessments(filters?: AssessmentFilters) {
  const where: Prisma.AssessmentWhereInput = {};

  if (filters?.query) {
    const term = filters.query;
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { vendor: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  if (filters?.status) {
    where.status = filters.status as AssessmentStatus;
  }

  if (filters?.fromDate) {
    where.createdAt = {
      ...((where.createdAt as Prisma.DateTimeFilter) ?? {}),
      gte: new Date(filters.fromDate),
    };
  }

  if (filters?.toDate) {
    const toDate = new Date(filters.toDate);
    toDate.setHours(23, 59, 59, 999);
    if (!where.createdAt) {
      where.createdAt = { lte: toDate };
    } else {
      (where.createdAt as Prisma.DateTimeFilter).lte = toDate;
    }
  }

  return prisma.assessment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      vendor: { select: { name: true } },
      template: { select: { name: true, version: true } },
      reviewer: { select: { name: true } },
    },
  });
}

export function getAssessment(id: string) {
  return prisma.assessment.findUnique({
    where: { id },
    include: {
      vendor: true,
      template: { select: { name: true, version: true } },
      reviewer: { select: { id: true, name: true, email: true } },
      questions: { orderBy: { order: "asc" } },
      responses: { include: { review: true } },
      evidence: true,
      findings: { orderBy: { severity: "asc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          replies: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
}

export function createAssessment(vendorId: string, input: AssessmentInput) {
  return prisma.assessment.create({
    data: {
      vendorId,
      templateId: input.templateId,
      title: input.title,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      reviewerId: input.reviewerId || null,
      status: "DRAFT",
    },
  });
}

export function updateAssessment(
  id: string,
  input: { title?: string; dueDate?: string },
) {
  return prisma.assessment.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
        : {}),
    },
  });
}

export function deleteAssessment(id: string) {
  return prisma.assessment.delete({ where: { id } });
}

export async function sendAssessment(id: string): Promise<void> {
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    select: { templateId: true, status: true },
  });
  if (!assessment) {
    throw new Error("Assessment not found");
  }
  if (!assessment.templateId) {
    throw new Error("Assessment has no template");
  }
  if (assessment.status !== "DRAFT") {
    throw new Error("Assessment has already been sent");
  }

  const template = await getTemplateForBuilder(assessment.templateId);
  if (!template) {
    throw new Error("Template not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.assessmentQuestion.deleteMany({ where: { assessmentId: id } });

    const questionIdMap = new Map<string, string>();
    let order = 0;

    for (const section of template.sections) {
      for (const question of section.questions) {
        const snapshot = await tx.assessmentQuestion.create({
          data: {
            assessmentId: id,
            sectionTitle: section.title,
            text: question.text,
            helpText: question.helpText,
            type: question.type,
            riskWeight: question.riskWeight,
            required: question.required,
            expectedAnswer: copyJson(question.expectedAnswer),
            options: copyJson(question.options),
            conditionalLogic: copyJson(question.conditionalLogic),
            controlIds: question.controls.map((link) => link.controlId),
            order,
          },
        });
        questionIdMap.set(question.id, snapshot.id);
        order += 1;
      }
    }

    for (const section of template.sections) {
      for (const question of section.questions) {
        const logic = question.conditionalLogic;
        if (
          logic &&
          typeof logic === "object" &&
          !Array.isArray(logic) &&
          "questionId" in logic
        ) {
          const referencedOldId = (logic as { questionId?: unknown })
            .questionId;
          const newId = questionIdMap.get(question.id);
          if (
            typeof referencedOldId === "string" &&
            newId &&
            questionIdMap.has(referencedOldId)
          ) {
            await tx.assessmentQuestion.update({
              where: { id: newId },
              data: {
                conditionalLogic: {
                  ...(logic as Record<string, unknown>),
                  questionId: questionIdMap.get(referencedOldId),
                } as Prisma.InputJsonValue,
              },
            });
          }
        }
      }
    }

    const token = generateAccessToken();
    await tx.assessment.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        accessToken: token,
        tokenHash: hashToken(token),
        tokenExpiresAt: expiryFromNow(),
      },
    });
  });
}

export function revokeAssessmentToken(id: string) {
  return prisma.assessment.update({
    where: { id },
    data: { accessToken: null, tokenHash: null },
  });
}

export function extendAssessmentToken(id: string, days = 30) {
  return prisma.assessment.update({
    where: { id },
    data: { tokenExpiresAt: expiryFromNow(days) },
  });
}

export function regenerateAssessmentToken(id: string) {
  const token = generateAccessToken();
  return prisma.assessment.update({
    where: { id },
    data: {
      accessToken: token,
      tokenHash: hashToken(token),
      tokenExpiresAt: expiryFromNow(),
    },
  });
}

export function getAssessmentByToken(token: string) {
  const tokenHash = hashToken(token);
  return prisma.assessment.findFirst({
    where: { OR: [{ tokenHash }, { accessToken: token }] },
    include: {
      vendor: { select: { name: true } },
      questions: { orderBy: { order: "asc" } },
      responses: { include: { review: true } },
      evidence: {
        select: { id: true, fileName: true, assessmentQuestionId: true },
      },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });
}

export function getAssessmentForToken(token: string) {
  const tokenHash = hashToken(token);
  return prisma.assessment.findFirst({
    where: { OR: [{ tokenHash }, { accessToken: token }] },
    select: { id: true, status: true, tokenExpiresAt: true },
  });
}

export function isTokenExpired(tokenExpiresAt: Date | null): boolean {
  return tokenExpiresAt !== null && tokenExpiresAt.getTime() < Date.now();
}

export function isPortalEditable(status: string, tokenExpiresAt: Date | null) {
  if (isTokenExpired(tokenExpiresAt)) {
    return false;
  }
  return status === "SENT" || status === "IN_PROGRESS";
}

function toAnswerValue(
  value: Prisma.JsonValue | null,
): string | number | boolean | string[] | null {
  if (value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return String(value);
}

export async function saveResponses(
  token: string,
  answers: SaveProgressInput["answers"],
): Promise<{ ok: boolean }> {
  const assessment = await getAssessmentForToken(token);
  if (
    !assessment ||
    !isPortalEditable(assessment.status, assessment.tokenExpiresAt)
  ) {
    return { ok: false };
  }

  const validQuestions = await prisma.assessmentQuestion.findMany({
    where: { assessmentId: assessment.id },
    select: { id: true },
  });
  const validQuestionIds = new Set(
    validQuestions.map((question) => question.id),
  );

  await prisma.$transaction(async (tx) => {
    const operations = answers
      .filter((answer) => validQuestionIds.has(answer.assessmentQuestionId))
      .map((answer) => {
        const value = answer.value === null ? Prisma.DbNull : answer.value;
        return tx.response.upsert({
          where: { assessmentQuestionId: answer.assessmentQuestionId },
          update: { value, isNotApplicable: answer.isNotApplicable },
          create: {
            assessmentId: assessment.id,
            assessmentQuestionId: answer.assessmentQuestionId,
            value,
            isNotApplicable: answer.isNotApplicable,
          },
        });
      });

    await Promise.all(operations);

    if (assessment.status === "SENT") {
      await tx.assessment.update({
        where: { id: assessment.id },
        data: { status: "IN_PROGRESS" },
      });
    }
  });

  return { ok: true };
}

export async function submitAssessment(
  token: string,
): Promise<{ ok: boolean; missing: number }> {
  const assessment = await prisma.assessment.findUnique({
    where: { accessToken: token },
    include: {
      questions: {
        select: { id: true, required: true, conditionalLogic: true },
      },
      responses: {
        select: {
          assessmentQuestionId: true,
          value: true,
          isNotApplicable: true,
        },
      },
    },
  });

  if (
    !assessment ||
    !isPortalEditable(assessment.status, assessment.tokenExpiresAt)
  ) {
    return { ok: false, missing: -1 };
  }

  const answers: PortalAnswers = {};
  for (const response of assessment.responses) {
    answers[response.assessmentQuestionId] = {
      value: toAnswerValue(response.value),
      isNotApplicable: response.isNotApplicable,
    };
  }

  const missing = findMissingRequiredQuestions(
    assessment.questions.map((question) => ({
      id: question.id,
      required: question.required,
      conditionalLogic: question.conditionalLogic,
    })),
    answers,
  );

  if (missing.length > 0) {
    return { ok: false, missing: missing.length };
  }

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  await scoreAssessment(assessment.id);

  return { ok: true, missing: 0 };
}

export function createEvidence(params: {
  assessmentId: string;
  assessmentQuestionId: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}) {
  return prisma.evidence.create({ data: params });
}

export function getEvidence(id: string) {
  return prisma.evidence.findUnique({ where: { id } });
}

export function getAssessmentForEmail(id: string): Promise<{
  title: string;
  accessToken: string | null;
  dueDate: Date | null;
  vendorName: string;
  vendorContactEmail: string;
} | null> {
  return prisma.assessment
    .findUnique({
      where: { id },
      select: {
        title: true,
        accessToken: true,
        dueDate: true,
        vendor: { select: { name: true, contactEmail: true } },
      },
    })
    .then((record) =>
      record
        ? {
            title: record.title,
            accessToken: record.accessToken,
            dueDate: record.dueDate,
            vendorName: record.vendor.name,
            vendorContactEmail: record.vendor.contactEmail,
          }
        : null,
    );
}

export function getAssessmentQuestion(id: string) {
  return prisma.assessmentQuestion.findUnique({
    where: { id },
    select: { assessmentId: true },
  });
}
