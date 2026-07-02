import { Prisma, type QuestionType, TemplateStatus } from "@prisma/client";

import { copyJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { remapConditionalLogic } from "@/lib/portal";
import { type QuestionInput, type TemplateInput } from "@/lib/schemas/template";

export function listTemplates() {
  return prisma.template.findMany({
    orderBy: [{ name: "asc" }, { version: "asc" }],
    include: { _count: { select: { sections: true } } },
  });
}

export function getTemplateStatus(id: string) {
  return prisma.template.findUnique({
    where: { id },
    select: { status: true },
  });
}

export function listPublishedTemplates() {
  return prisma.template.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ name: "asc" }, { version: "desc" }],
    select: { id: true, name: true, version: true },
  });
}

export function getQuestion(id: string) {
  return prisma.question.findUnique({
    where: { id },
    include: {
      controls: true,
      section: { select: { templateId: true } },
    },
  });
}

export async function listTemplateQuestions(
  templateId: string,
): Promise<{ id: string; text: string }[]> {
  const sections = await prisma.section.findMany({
    where: { templateId },
    orderBy: { order: "asc" },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, text: true },
      },
    },
  });

  return sections.flatMap((section) => section.questions);
}

export function getTemplateForBuilder(templateId: string) {
  return prisma.template.findUnique({
    where: { id: templateId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              controls: {
                include: { control: { include: { framework: true } } },
              },
            },
          },
        },
      },
    },
  });
}

export type TemplateForBuilder = NonNullable<
  Awaited<ReturnType<typeof getTemplateForBuilder>>
>;

export function createTemplate(input: TemplateInput) {
  return prisma.template.create({
    data: { name: input.name, description: input.description || null },
  });
}

export function updateTemplate(id: string, input: TemplateInput) {
  return prisma.template.update({
    where: { id },
    data: { name: input.name, description: input.description || null },
  });
}

export function getTemplateVersionChain(templateId: string): Promise<
  {
    id: string;
    name: string;
    version: number;
    status: string;
    updatedAt: Date;
  }[]
> {
  return prisma.$queryRaw`
    WITH RECURSIVE ancestors AS (
      SELECT id, "parentTemplateId"
      FROM templates
      WHERE id = ${templateId}
      UNION ALL
      SELECT t.id, t."parentTemplateId"
      FROM templates t
      INNER JOIN ancestors a ON t.id = a."parentTemplateId"
    ),
    root AS (
      SELECT id FROM ancestors WHERE "parentTemplateId" IS NULL LIMIT 1
    ),
    chain AS (
      SELECT id, name, "version", "status", "parentTemplateId", "updatedAt"
      FROM templates
      WHERE id = COALESCE((SELECT id FROM root), ${templateId})
      UNION ALL
      SELECT t.id, t.name, t."version", t."status", t."parentTemplateId", t."updatedAt"
      FROM templates t
      INNER JOIN chain c ON t."parentTemplateId" = c.id
    )
    SELECT id, name, "version", "status", "updatedAt"
    FROM chain
    ORDER BY "version" ASC
  `;
}

export async function deleteTemplate(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const target = await tx.template.findUnique({
      where: { id },
      select: { parentTemplateId: true },
    });
    if (!target) {
      return;
    }
    await tx.template.updateMany({
      where: { parentTemplateId: id },
      data: { parentTemplateId: target.parentTemplateId },
    });
    await tx.template.delete({ where: { id } });
  });
}

export async function addSection(templateId: string, title: string) {
  const order = await prisma.section.count({ where: { templateId } });
  return prisma.section.create({ data: { templateId, title, order } });
}

export function updateSection(id: string, title: string) {
  return prisma.section.update({ where: { id }, data: { title } });
}

export function deleteSection(id: string) {
  return prisma.section.delete({ where: { id } });
}

function computeExpectedAnswer(
  type: QuestionType,
  raw: string | number | string[],
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (raw === null || raw === undefined) {
    return Prisma.DbNull;
  }

  if (Array.isArray(raw)) {
    return raw.length > 0 ? raw : Prisma.DbNull;
  }

  if (type === "NUMERIC" || type === "RATING") {
    if (typeof raw === "number") {
      return Number.isFinite(raw) ? raw : Prisma.DbNull;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : Prisma.DbNull;
  }

  const trimmed = String(raw).trim();
  return trimmed || Prisma.DbNull;
}

function buildQuestionScalarFields(data: QuestionInput) {
  const options: Prisma.InputJsonValue =
    data.type === "MULTIPLE_CHOICE" ||
    data.type === "COMBOBOX" ||
    data.type === "MULTI_SELECT"
      ? data.options
      : [];
  const expectedAnswer = computeExpectedAnswer(data.type, data.expectedAnswer);
  const conditionalLogic: Prisma.InputJsonValue | typeof Prisma.DbNull =
    data.conditionalLogic.rules.length > 0
      ? (data.conditionalLogic as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull;

  return {
    text: data.text,
    helpText: data.helpText || null,
    type: data.type,
    riskWeight: data.riskWeight,
    required: data.required,
    options,
    expectedAnswer,
    conditionalLogic,
  };
}

export async function addQuestion(sectionId: string, data: QuestionInput) {
  const order = await prisma.question.count({ where: { sectionId } });
  return prisma.question.create({
    data: {
      sectionId,
      order,
      ...buildQuestionScalarFields(data),
      controls: {
        create: data.controlIds.map((controlId) => ({ controlId })),
      },
    },
  });
}

export function updateQuestion(id: string, data: QuestionInput) {
  return prisma.$transaction([
    prisma.questionControl.deleteMany({ where: { questionId: id } }),
    prisma.question.update({
      where: { id },
      data: {
        ...buildQuestionScalarFields(data),
        controls: {
          create: data.controlIds.map((controlId) => ({ controlId })),
        },
      },
    }),
  ]);
}

export function deleteQuestion(id: string) {
  return prisma.question.delete({ where: { id } });
}

export function publishTemplate(id: string) {
  return prisma.template.update({
    where: { id },
    data: { status: TemplateStatus.PUBLISHED },
  });
}

export function unpublishTemplate(id: string) {
  return prisma.template.update({
    where: { id },
    data: { status: TemplateStatus.DRAFT },
  });
}

export async function createNewVersion(templateId: string): Promise<string> {
  const source = await getTemplateForBuilder(templateId);
  if (!source) {
    throw new Error("Template not found");
  }

  return prisma.$transaction(async (tx) => {
    const clone = await tx.template.create({
      data: {
        name: source.name,
        description: source.description,
        version: source.version + 1,
        status: TemplateStatus.DRAFT,
        parentTemplateId: source.id,
      },
    });

    const questionIdMap = new Map<string, string>();

    for (const section of source.sections) {
      const newSection = await tx.section.create({
        data: {
          templateId: clone.id,
          title: section.title,
          order: section.order,
        },
      });

      for (const question of section.questions) {
        const newQuestion = await tx.question.create({
          data: {
            sectionId: newSection.id,
            text: question.text,
            helpText: question.helpText,
            type: question.type,
            riskWeight: question.riskWeight,
            required: question.required,
            options: copyJson(question.options),
            expectedAnswer: copyJson(question.expectedAnswer),
            conditionalLogic: copyJson(question.conditionalLogic),
            order: question.order,
            controls: {
              create: question.controls.map((link) => ({
                controlId: link.controlId,
              })),
            },
          },
        });
        questionIdMap.set(question.id, newQuestion.id);
      }
    }

    await remapClonedConditionalLogic(tx, source, questionIdMap);

    return clone.id;
  });
}

type TemplateTx = Prisma.TransactionClient;

async function remapClonedConditionalLogic(
  tx: TemplateTx,
  source: TemplateForBuilder,
  questionIdMap: Map<string, string>,
): Promise<void> {
  for (const section of source.sections) {
    for (const question of section.questions) {
      const newId = questionIdMap.get(question.id);
      if (!newId) continue;
      const remapped = remapConditionalLogic(
        question.conditionalLogic,
        questionIdMap,
      );
      if (remapped) {
        await tx.question.update({
          where: { id: newId },
          data: {
            conditionalLogic: remapped as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }
  }
}

async function uniqueCopyName(base: string): Promise<string> {
  let candidate = `${base} (copy)`;
  let attempt = 2;
  while (await prisma.template.findFirst({ where: { name: candidate } })) {
    candidate = `${base} (copy ${attempt})`;
    attempt += 1;
  }
  return candidate;
}

export async function duplicateTemplate(templateId: string): Promise<string> {
  const source = await getTemplateForBuilder(templateId);
  if (!source) {
    throw new Error("Template not found");
  }
  const name = await uniqueCopyName(source.name);

  return prisma.$transaction(async (tx) => {
    const clone = await tx.template.create({
      data: {
        name,
        description: source.description,
        version: 1,
        status: TemplateStatus.DRAFT,
      },
    });

    const questionIdMap = new Map<string, string>();

    for (const section of source.sections) {
      const newSection = await tx.section.create({
        data: {
          templateId: clone.id,
          title: section.title,
          order: section.order,
        },
      });

      for (const question of section.questions) {
        const newQuestion = await tx.question.create({
          data: {
            sectionId: newSection.id,
            text: question.text,
            helpText: question.helpText,
            type: question.type,
            riskWeight: question.riskWeight,
            required: question.required,
            options: copyJson(question.options),
            expectedAnswer: copyJson(question.expectedAnswer),
            conditionalLogic: copyJson(question.conditionalLogic),
            order: question.order,
            controls: {
              create: question.controls.map((link) => ({
                controlId: link.controlId,
              })),
            },
          },
        });
        questionIdMap.set(question.id, newQuestion.id);
      }
    }

    await remapClonedConditionalLogic(tx, source, questionIdMap);

    return clone.id;
  });
}

async function swapOrder(
  model: "section" | "question",
  currentId: string,
  currentOrder: number,
  neighbor: { id: string; order: number } | null,
): Promise<void> {
  if (!neighbor) return;
  if (model === "section") {
    await prisma.$transaction([
      prisma.section.update({
        where: { id: currentId },
        data: { order: neighbor.order },
      }),
      prisma.section.update({
        where: { id: neighbor.id },
        data: { order: currentOrder },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.question.update({
        where: { id: currentId },
        data: { order: neighbor.order },
      }),
      prisma.question.update({
        where: { id: neighbor.id },
        data: { order: currentOrder },
      }),
    ]);
  }
}

export async function moveSection(
  sectionId: string,
  direction: "up" | "down",
): Promise<void> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { id: true, order: true, templateId: true },
  });
  if (!section) return;
  const neighbor = await prisma.section.findFirst({
    where: {
      templateId: section.templateId,
      order: direction === "up" ? { lt: section.order } : { gt: section.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
    select: { id: true, order: true },
  });
  await swapOrder("section", section.id, section.order, neighbor);
}

export async function moveQuestion(
  questionId: string,
  direction: "up" | "down",
): Promise<void> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, order: true, sectionId: true },
  });
  if (!question) return;
  const neighbor = await prisma.question.findFirst({
    where: {
      sectionId: question.sectionId,
      order:
        direction === "up" ? { lt: question.order } : { gt: question.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
    select: { id: true, order: true },
  });
  await swapOrder("question", question.id, question.order, neighbor);
}

export function getControlWithMappings(controlId: string) {
  return prisma.control.findUnique({
    where: { id: controlId },
    include: {
      framework: true,
      questionControls: {
        include: {
          question: {
            select: {
              id: true,
              text: true,
              section: {
                select: {
                  templateId: true,
                  template: {
                    select: {
                      id: true,
                      name: true,
                      version: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}
