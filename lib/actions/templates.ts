"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit, logAuditSafe } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import {
  addQuestion,
  addSection,
  createNewVersion,
  createTemplate,
  deleteQuestion,
  deleteSection,
  deleteTemplate,
  duplicateTemplate,
  getTemplateStatus,
  moveQuestion,
  moveSection,
  publishTemplate,
  unpublishTemplate,
  updateQuestion,
  updateSection,
  updateTemplate,
} from "@/lib/db/templates";
import { Prisma, type QuestionType, type RiskWeight } from "@prisma/client";
import { copyJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import {
  QUESTION_TYPES,
  questionSchema,
  sectionSchema,
  templateSchema,
} from "@/lib/schemas/template";

export type FormState = { error: string } | undefined;

async function assertEditable(templateId: string) {
  const template = await getTemplateStatus(templateId);
  if (!template || template.status !== "DRAFT") {
    throw new Error("Only draft templates can be edited.");
  }
}

export async function createTemplateAction(
  previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission(PERMISSIONS.TEMPLATES_CREATE);
  const parsed = templateSchema.safeParse({
    name: getField(formData, "name"),
    description: getField(formData, "description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const template = await createTemplate(parsed.data);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "CREATE_TEMPLATE", "Template", template.id);
  }
  redirect(`/templates/${template.id}`);
}

export async function updateTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const templateId = getField(formData, "templateId");
  await assertEditable(templateId);
  const parsed = templateSchema.safeParse({
    name: getField(formData, "name"),
    description: getField(formData, "description"),
  });
  if (parsed.success) {
    await updateTemplate(templateId, parsed.data);
    const user = await getCurrentUser();
    if (user) {
      await logAudit(user.id, "UPDATE_TEMPLATE", "Template", templateId);
    }
  }
  revalidatePath(`/templates/${templateId}`);
}

export async function deleteTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TEMPLATES_DELETE);
  const templateId = getField(formData, "templateId");
  await deleteTemplate(templateId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "DELETE_TEMPLATE", "Template", templateId);
  }
  redirect("/templates");
}

export async function addSectionAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const templateId = getField(formData, "templateId");
  await assertEditable(templateId);
  const parsed = sectionSchema.safeParse({
    title: getField(formData, "title"),
  });
  if (parsed.success) {
    const section = await addSection(templateId, parsed.data.title);
    logAuditSafe(user.id, "UPDATE_TEMPLATE", "Template", templateId, {
      change: "add_section",
      sectionId: section.id,
      title: parsed.data.title,
    });
  }
  revalidatePath(`/templates/${templateId}`);
}

export async function updateSectionAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const templateId = getField(formData, "templateId");
  await assertEditable(templateId);
  const sectionId = getField(formData, "sectionId");
  const parsed = sectionSchema.safeParse({
    title: getField(formData, "title"),
  });
  if (parsed.success) {
    await updateSection(sectionId, parsed.data.title);
    logAuditSafe(user.id, "UPDATE_TEMPLATE", "Template", templateId, {
      change: "rename_section",
      sectionId,
      title: parsed.data.title,
    });
  }
  revalidatePath(`/templates/${templateId}`);
}

export async function deleteSectionAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const templateId = getField(formData, "templateId");
  await assertEditable(templateId);
  const sectionId = getField(formData, "sectionId");
  await deleteSection(sectionId);
  logAuditSafe(user.id, "UPDATE_TEMPLATE", "Template", templateId, {
    change: "delete_section",
    sectionId,
  });
  revalidatePath(`/templates/${templateId}`);
}

export async function saveQuestionAction(
  previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const templateId = getField(formData, "templateId");
  await assertEditable(templateId);
  const sectionId = getField(formData, "sectionId");
  const questionId = getField(formData, "questionId");

  const options = getField(formData, "options")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const type = getField(formData, "type");

  let expectedAnswer: string | number | string[] = getField(
    formData,
    "expectedAnswer",
  );
  if (type === "MULTI_SELECT") {
    expectedAnswer = expectedAnswer
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } else if (type === "NUMERIC" || type === "RATING") {
    expectedAnswer = Number(expectedAnswer);
  }

  let conditionalLogic: unknown = { match: "all", rules: [] };
  const conditionalRaw = getField(formData, "conditionalLogic");
  if (conditionalRaw) {
    try {
      conditionalLogic = JSON.parse(conditionalRaw);
    } catch (error: unknown) {
      console.error("Failed to parse conditional logic:", error);
      return { error: "Invalid conditional logic." };
    }
  }

  const parsed = questionSchema.safeParse({
    text: getField(formData, "text"),
    helpText: getField(formData, "helpText"),
    type,
    riskWeight: getField(formData, "riskWeight"),
    required: formData.get("required") !== null,
    options,
    expectedAnswer,
    conditionalLogic,
    controlIds: formData.getAll("controlIds").map(String),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (questionId) {
    await updateQuestion(questionId, parsed.data);
    logAuditSafe(user.id, "UPDATE_TEMPLATE", "Template", templateId, {
      change: "update_question",
      questionId,
    });
  } else {
    const question = await addQuestion(sectionId, parsed.data);
    logAuditSafe(user.id, "UPDATE_TEMPLATE", "Template", templateId, {
      change: "add_question",
      sectionId,
      questionId: question.id,
    });
  }
  revalidatePath(`/templates/${templateId}`);
  redirect(`/templates/${templateId}`);
}

export async function deleteQuestionAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const templateId = getField(formData, "templateId");
  await assertEditable(templateId);
  const questionId = getField(formData, "questionId");
  await deleteQuestion(questionId);
  logAuditSafe(user.id, "UPDATE_TEMPLATE", "Template", templateId, {
    change: "delete_question",
    questionId,
  });
  revalidatePath(`/templates/${templateId}`);
}

export async function moveSectionAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const templateId = getField(formData, "templateId");
  await assertEditable(templateId);
  const sectionId = getField(formData, "sectionId");
  const direction = getField(formData, "direction") === "up" ? "up" : "down";
  await moveSection(sectionId, direction);
  logAuditSafe(user.id, "UPDATE_TEMPLATE", "Template", templateId, {
    change: "move_section",
    sectionId,
    direction,
  });
  revalidatePath(`/templates/${templateId}`);
}

export async function moveQuestionAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const templateId = getField(formData, "templateId");
  await assertEditable(templateId);
  const questionId = getField(formData, "questionId");
  const direction = getField(formData, "direction") === "up" ? "up" : "down";
  await moveQuestion(questionId, direction);
  logAuditSafe(user.id, "UPDATE_TEMPLATE", "Template", templateId, {
    change: "move_question",
    questionId,
    direction,
  });
  revalidatePath(`/templates/${templateId}`);
}

export async function duplicateTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TEMPLATES_CREATE);
  const templateId = getField(formData, "templateId");
  const newId = await duplicateTemplate(templateId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "DUPLICATE_TEMPLATE", "Template", newId, {
      sourceTemplateId: templateId,
    });
  }
  redirect(`/templates/${newId}`);
}

export async function publishTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const templateId = getField(formData, "templateId");
  await publishTemplate(templateId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "PUBLISH_TEMPLATE", "Template", templateId);
  }
  revalidatePath(`/templates/${templateId}`);
}

export async function unpublishTemplateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TEMPLATES_EDIT);
  const templateId = getField(formData, "templateId");
  await unpublishTemplate(templateId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "UNPUBLISH_TEMPLATE", "Template", templateId);
  }
  revalidatePath(`/templates/${templateId}`);
}

export async function createNewVersionAction(formData: FormData) {
  await requirePermission(PERMISSIONS.TEMPLATES_CREATE);
  const newTemplateId = await createNewVersion(
    getField(formData, "templateId"),
  );
  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      "CREATE_TEMPLATE_VERSION",
      "Template",
      newTemplateId,
    );
  }
  redirect(`/templates/${newTemplateId}`);
}

type ImportJson = {
  name: string;
  description?: string;
  sections: {
    title: string;
    questions: {
      text: string;
      helpText?: string;
      type: string;
      riskWeight: string;
      required: boolean;
      options?: unknown;
      expectedAnswer?: unknown;
      conditionalLogic?: unknown;
      controlCodes?: string[];
    }[];
  }[];
};

export type TemplateImportState =
  | { ok: true; message: string; error?: undefined }
  | { ok: false; error: string; message?: undefined }
  | undefined;

export async function importTemplateAction(
  previousState: TemplateImportState,
  formData: FormData,
): Promise<TemplateImportState> {
  await requirePermission(PERMISSIONS.TEMPLATES_CREATE);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }

  if (file.size > 1_000_000) {
    return { ok: false, error: "File is too large (max 1 MB)." };
  }

  let data: ImportJson;
  try {
    data = JSON.parse(await file.text());
  } catch (error: unknown) {
    console.error("Failed to parse import JSON:", error);
    return { ok: false, error: "Invalid JSON file." };
  }

  if (
    !data.name ||
    typeof data.name !== "string" ||
    !Array.isArray(data.sections)
  ) {
    return { ok: false, error: "Invalid template structure." };
  }

  const validTypes: string[] = [...QUESTION_TYPES];
  const validWeights = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

  for (const section of data.sections) {
    if (!section.title || !Array.isArray(section.questions)) {
      return { ok: false, error: "Invalid section structure." };
    }
    for (const q of section.questions) {
      if (!validTypes.includes(q.type))
        return { ok: false, error: `Unknown type: ${q.type}` };
      if (!validWeights.includes(q.riskWeight))
        return { ok: false, error: `Unknown risk weight: ${q.riskWeight}` };
    }
  }

  const allCodes = data.sections.flatMap((s) =>
    s.questions.flatMap((q) => q.controlCodes ?? []),
  );
  const uniqueCodes = [...new Set(allCodes)];

  const controls =
    uniqueCodes.length > 0
      ? await prisma.control.findMany({
          where: { code: { in: uniqueCodes } },
          select: { id: true, code: true },
        })
      : [];
  const controlByCode = new Map(controls.map((c) => [c.code, c.id]));

  for (const code of uniqueCodes) {
    if (!controlByCode.has(code)) {
      return { ok: false, error: `Control code not found: ${code}` };
    }
  }

  await prisma.$transaction(async (tx) => {
    const template = await tx.template.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        status: "DRAFT",
        version: 1,
      },
    });

    for (const section of data.sections) {
      const created = await tx.section.create({
        data: { templateId: template.id, title: section.title },
      });

      for (const question of section.questions) {
        const controlIds = (question.controlCodes ?? [])
          .map((code) => controlByCode.get(code))
          .filter((id): id is string => !!id);

        await tx.question.create({
          data: {
            sectionId: created.id,
            text: question.text,
            helpText: question.helpText ?? null,
            // Validated against QUESTION_TYPES / risk weights above.
            type: question.type as QuestionType,
            riskWeight: question.riskWeight as RiskWeight,
            required: question.required,
            expectedAnswer: copyJson(
              question.expectedAnswer ?? null,
            ) as Prisma.InputJsonValue,
            options: copyJson(
              question.options ?? null,
            ) as Prisma.InputJsonValue,
            conditionalLogic: copyJson(
              question.conditionalLogic ?? null,
            ) as Prisma.InputJsonValue,
            controls: {
              create: controlIds.map((controlId) => ({ controlId })),
            },
          },
        });
      }
    }
  });

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "IMPORT_TEMPLATE", "Template");
  }
  return { ok: true, message: `Imported "${data.name}" as a new DRAFT.` };
}
