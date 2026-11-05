"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Prisma } from "../../prisma/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import {
  deleteFramework,
  createFrameworkWithControls,
  updateControlSharedResponsibility,
  getAllMappedControlIds,
} from "@/lib/db/frameworks";
import { parseCsvRows } from "@/lib/csv-parser";
import {
  frameworkCsvRowSchema,
  frameworkImportSchema,
} from "@/lib/schemas/framework";

export type FrameworkImportState = {
  ok: boolean;
  message: string;
  frameworkId?: string;
};

export async function importFrameworkAction(
  _previousState: FrameworkImportState,
  formData: FormData,
): Promise<FrameworkImportState> {
  const user = await requirePermission(PERMISSIONS.FRAMEWORKS_EDIT);
  const translations = await getTranslations("Frameworks.import");
  const errorTranslations = await getTranslations("Frameworks.import.errors");

  const name = (formData.get("name") as string)?.trim();
  const version = (formData.get("version") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || "";
  const file = formData.get("csvFile") as File | null;

  const meta = frameworkImportSchema.safeParse({ name, version, description });
  if (!meta.success) {
    const firstIssue = meta.error.issues[0];
    const field = firstIssue?.path[0];
    if (field === "name") {
      return {
        ok: false,
        message:
          firstIssue?.code === "too_big"
            ? errorTranslations("nameTooLong")
            : errorTranslations("nameRequired"),
      };
    }
    if (field === "version") {
      return {
        ok: false,
        message:
          firstIssue?.code === "too_big"
            ? errorTranslations("versionTooLong")
            : errorTranslations("versionRequired"),
      };
    }
    if (field === "description") {
      return { ok: false, message: errorTranslations("descriptionTooLong") };
    }
    return { ok: false, message: errorTranslations("invalidInput") };
  }

  if (!file || !(file instanceof File)) {
    return { ok: false, message: errorTranslations("noFile") };
  }

  if (!file.name.endsWith(".csv")) {
    return { ok: false, message: errorTranslations("invalidFileType") };
  }

  const text = await file.text();
  if (text.length > 1_000_000) {
    return { ok: false, message: errorTranslations("tooLarge") };
  }

  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return { ok: false, message: errorTranslations("noRows") };
  }

  const expectedHeaders = ["domain", "code", "title", "guidance"];
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const missing = expectedHeaders.filter(
    (expected) => !header.includes(expected),
  );
  if (missing.length > 0) {
    return {
      ok: false,
      message: errorTranslations("missingColumns", {
        columns: missing.join(", "),
        expected: expectedHeaders.join(", "),
      }),
    };
  }

  const domainIndex = header.indexOf("domain");
  const codeIndex = header.indexOf("code");
  const titleIndex = header.indexOf("title");
  const guidanceIndex = header.indexOf("guidance");
  const sharedIndex = header.indexOf("is_shared_responsibility");

  const controls: {
    domain: string;
    code: string;
    title: string;
    guidance: string;
    order: number;
    isSharedResponsibility: boolean;
  }[] = [];

  const seenCodes = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parsed = frameworkCsvRowSchema.safeParse({
      domain: row[domainIndex]?.trim() ?? "",
      code: row[codeIndex]?.trim() ?? "",
      title: row[titleIndex]?.trim() ?? "",
      guidance: row[guidanceIndex]?.trim() ?? "",
      isSharedResponsibility:
        sharedIndex >= 0 ? row[sharedIndex]?.trim() : "false",
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const field = firstIssue?.path[0];
      let message = errorTranslations("rowInvalid", { row: i + 1 });
      if (field === "domain") {
        message = errorTranslations("rowDomainRequired", { row: i + 1 });
      } else if (field === "code") {
        message = errorTranslations("rowCodeRequired", { row: i + 1 });
      } else if (field === "title") {
        message = errorTranslations("rowTitleRequired", { row: i + 1 });
      }
      return { ok: false, message };
    }

    if (seenCodes.has(parsed.data.code)) {
      return {
        ok: false,
        message: errorTranslations("duplicateCode", {
          row: i + 1,
          code: parsed.data.code,
        }),
      };
    }
    seenCodes.add(parsed.data.code);

    controls.push({
      domain: parsed.data.domain,
      code: parsed.data.code,
      title: parsed.data.title,
      guidance: parsed.data.guidance,
      order: i,
      isSharedResponsibility: parsed.data.isSharedResponsibility,
    });
  }

  let framework;
  try {
    framework = await createFrameworkWithControls({
      name: meta.data.name,
      version: meta.data.version,
      description: meta.data.description,
      controls: controls.map((control) => ({
        domain: control.domain,
        code: control.code,
        title: control.title,
        guidance: control.guidance,
        order: control.order,
        isSharedResponsibility: control.isSharedResponsibility,
      })),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        message: errorTranslations("duplicateFramework", {
          name: meta.data.name,
          version: meta.data.version,
        }),
      };
    }
    throw error;
  }

  await logAudit(
    user.id,
    AUDIT_ACTIONS.CREATE_FRAMEWORK,
    "Framework",
    framework.id,
  );

  return {
    ok: true,
    message: translations("form.success", {
      name: framework.name,
      version: framework.version,
      count: controls.length,
    }),
    frameworkId: framework.id,
  };
}

export async function deleteFrameworkAction(formData: FormData) {
  await requirePermission(PERMISSIONS.FRAMEWORKS_DELETE);
  const frameworkId = getField(formData, "frameworkId");

  // Deleting a framework cascades its controls away and silently strips every
  // question→control mapping that references them, corrupting coverage and
  // radar data for all templates. Block while any of its controls are mapped;
  // the caller must unmap them first.
  const controls = await prisma.control.findMany({
    where: { frameworkId },
    select: { id: true },
  });
  const mappedIds = await getAllMappedControlIds();
  const mappedCount = controls.filter((control) =>
    mappedIds.has(control.id),
  ).length;
  if (mappedCount > 0) {
    // Surface the block on the list page rather than failing silently.
    redirect(
      `/frameworks?deleteBlocked=${encodeURIComponent(String(mappedCount))}`,
    );
  }

  await logAudit(
    (await getCurrentUser())?.id ?? "unknown",
    AUDIT_ACTIONS.DELETE_FRAMEWORK,
    "Framework",
    frameworkId,
  );
  await deleteFramework(frameworkId);
  redirect("/frameworks");
}

export async function toggleSharedResponsibilityAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.FRAMEWORKS_EDIT);

  const controlId = getField(formData, "controlId");
  const value = getField(formData, "isShared");
  const frameworkId = getField(formData, "frameworkId");

  if (!controlId) {
    return;
  }

  const isShared = value === "true";
  const control = await updateControlSharedResponsibility(controlId, isShared);

  await logAudit(
    user.id,
    isShared
      ? AUDIT_ACTIONS.MARK_CONTROL_SHARED
      : AUDIT_ACTIONS.UNMARK_CONTROL_SHARED,
    "Control",
    controlId,
    { code: control.code, framework: control.frameworkId },
  );

  if (frameworkId) {
    revalidatePath(`/frameworks/${frameworkId}`);
  }
}
