import { Prisma, type AssessmentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

import { getTemplateForBuilder } from "@/lib/db/templates";
import { copyJson } from "@/lib/json";
import { findMissingRequiredQuestions, type PortalAnswers } from "@/lib/portal";
import { scoreAssessment } from "@/lib/db/scoring";
import { remapConditionalLogic } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { type AssessmentInput } from "@/lib/schemas/assessment";
import { type SaveProgressInput } from "@/lib/schemas/portal";
import { expiryFromNow, generateAccessToken, hashToken } from "@/lib/tokens";

export const ASSESSMENT_SORTS = {
  created: "Newest first",
  "created-asc": "Oldest first",
  "due-asc": "Due date (soonest)",
  "due-desc": "Due date (latest)",
  "score-asc": "Score (low → high)",
  "score-desc": "Score (high → low)",
  vendor: "Vendor (A–Z)",
  status: "Status (A–Z)",
  "status-desc": "Status (Z–A)",
} as const;

export type AssessmentSort = keyof typeof ASSESSMENT_SORTS;

export const OVERDUE_STATUSES: AssessmentStatus[] = ["SENT", "IN_PROGRESS"];

const DEFAULT_ASSESSMENT_PAGE_SIZE = 25;

function assessmentOrderBy(
  sort: AssessmentSort | undefined,
): Prisma.AssessmentOrderByWithRelationInput {
  switch (sort) {
    case "created-asc":
      return { createdAt: "asc" };
    case "due-asc":
      return { dueDate: { sort: "asc", nulls: "last" } };
    case "due-desc":
      return { dueDate: { sort: "desc", nulls: "last" } };
    case "score-asc":
      return { score: { sort: "asc", nulls: "last" } };
    case "score-desc":
      return { score: { sort: "desc", nulls: "last" } };
    case "vendor":
      return { vendor: { name: "asc" } };
    case "status":
      return { status: "asc" };
    case "status-desc":
      return { status: "desc" };
    default:
      return { createdAt: "desc" };
  }
}

export type AssessmentFilters = {
  query?: string;
  status?: string;
  vendorId?: string;
  fromDate?: string;
  toDate?: string;
  overdue?: boolean;
  sort?: AssessmentSort;
  page?: number;
  pageSize?: number;
};

export async function listAssessments(filters?: AssessmentFilters) {
  const where: Prisma.AssessmentWhereInput = {};

  if (filters?.query) {
    const term = filters.query;
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { vendor: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  if (filters?.vendorId) {
    where.vendorId = filters.vendorId;
  }

  if (filters?.overdue) {
    where.status = { in: OVERDUE_STATUSES };
    where.dueDate = { lt: new Date() };
  } else if (filters?.status) {
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

  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = filters?.pageSize ?? DEFAULT_ASSESSMENT_PAGE_SIZE;

  const [assessments, totalCount] = await Promise.all([
    prisma.assessment.findMany({
      where,
      orderBy: assessmentOrderBy(filters?.sort),
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: {
        vendor: { select: { name: true } },
        template: { select: { name: true, version: true } },
        reviewer: { select: { name: true } },
      },
    }),
    prisma.assessment.count({ where }),
  ]);

  return { assessments, totalCount, page, pageSize };
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
      findings: {
        orderBy: { severity: "asc" },
        include: { resolvedBy: { select: { name: true } } },
      },
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

async function deleteStoredFiles(storageKeys: string[]): Promise<void> {
  for (const key of storageKeys) {
    try {
      await storage.delete(key);
    } catch {
      // Best-effort: a missing file must never block the database delete.
      // The orphan-sweep cron is the backstop for any leftovers.
    }
  }
}

export async function deleteAssessment(id: string): Promise<void> {
  const evidence = await prisma.evidence.findMany({
    where: { assessmentId: id },
    select: { storageKey: true },
  });
  await deleteStoredFiles(evidence.map((item) => item.storageKey));
  await prisma.assessment.delete({ where: { id } });
}

export async function deleteEvidenceForQuestion(
  assessmentId: string,
  assessmentQuestionId: string,
): Promise<number> {
  const existing = await prisma.evidence.findMany({
    where: { assessmentId, assessmentQuestionId },
    select: { id: true, storageKey: true },
  });
  if (existing.length === 0) {
    return 0;
  }
  await prisma.evidence.deleteMany({
    where: { id: { in: existing.map((item) => item.id) } },
  });
  await deleteStoredFiles(existing.map((item) => item.storageKey));
  return existing.length;
}

export async function sendAssessment(
  id: string,
  portalPassword?: string,
): Promise<void> {
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

  const token = generateAccessToken();
  const passwordHash = portalPassword
    ? bcrypt.hashSync(portalPassword, 12)
    : null;

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
        const newId = questionIdMap.get(question.id);
        if (!newId) continue;
        const remapped = remapConditionalLogic(
          question.conditionalLogic,
          questionIdMap,
        );
        if (remapped) {
          await tx.assessmentQuestion.update({
            where: { id: newId },
            data: {
              conditionalLogic: remapped as unknown as Prisma.InputJsonValue,
            },
          });
        }
      }
    }

    await tx.assessment.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        accessToken: token,
        tokenHash: hashToken(token),
        tokenExpiresAt: expiryFromNow(),
        portalPasswordHash: passwordHash,
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

export function setAssessmentRecipients(id: string, emails: string[]) {
  const unique = [
    ...new Set(emails.filter((email) => email.trim().length > 0)),
  ];
  return prisma.assessment.update({
    where: { id },
    data: { portalRecipients: unique },
  });
}

export function getAssessmentRecipients(id: string): Promise<{
  portalRecipients: string[];
  vendor: { name: string; contactEmail: string };
  title: string;
  accessToken: string | null;
  dueDate: Date | null;
} | null> {
  return prisma.assessment.findUnique({
    where: { id },
    select: {
      portalRecipients: true,
      title: true,
      accessToken: true,
      dueDate: true,
      vendor: { select: { name: true, contactEmail: true } },
    },
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
    where: { tokenHash },
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
    where: { tokenHash },
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

  const previousStatus = assessment.status;

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  try {
    await scoreAssessment(assessment.id);
  } catch {
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: previousStatus },
    });
    throw new Error("Assessment scoring failed, please try submitting again.");
  }

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
