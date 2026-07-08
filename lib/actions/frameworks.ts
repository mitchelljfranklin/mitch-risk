"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit";
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

  const name = (formData.get("name") as string)?.trim();
  const version = (formData.get("version") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || "";
  const file = formData.get("csvFile") as File | null;

  const meta = frameworkImportSchema.safeParse({ name, version, description });
  if (!meta.success) {
    return { ok: false, message: meta.error.issues[0].message };
  }

  if (!file || !(file instanceof File)) {
    return { ok: false, message: "A CSV file is required." };
  }

  if (!file.name.endsWith(".csv")) {
    return { ok: false, message: "File must be a .csv file." };
  }

  const text = await file.text();
  if (text.length > 1_000_000) {
    return { ok: false, message: "CSV file is too large (max 1 MB)." };
  }

  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return { ok: false, message: "CSV file contains no data rows." };
  }

  const expectedHeaders = ["domain", "code", "title", "guidance"];
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const missing = expectedHeaders.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Missing CSV columns: ${missing.join(", ")}. Expected: ${expectedHeaders.join(", ")}`,
    };
  }

  const domainIndex = header.indexOf("domain");
  const codeIndex = header.indexOf("code");
  const titleIndex = header.indexOf("title");
  const guidanceIndex = header.indexOf("guidance");

  const controls: {
    domain: string;
    code: string;
    title: string;
    guidance: string;
    order: number;
  }[] = [];

  const seenCodes = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parsed = frameworkCsvRowSchema.safeParse({
      domain: row[domainIndex]?.trim() ?? "",
      code: row[codeIndex]?.trim() ?? "",
      title: row[titleIndex]?.trim() ?? "",
      guidance: row[guidanceIndex]?.trim() ?? "",
    });

    if (!parsed.success) {
      return {
        ok: false,
        message: `Row ${i + 1}: ${parsed.error.issues[0].message}`,
      };
    }

    if (seenCodes.has(parsed.data.code)) {
      return {
        ok: false,
        message: `Row ${i + 1}: duplicate control code "${parsed.data.code}".`,
      };
    }
    seenCodes.add(parsed.data.code);

    controls.push({
      domain: parsed.data.domain,
      code: parsed.data.code,
      title: parsed.data.title,
      guidance: parsed.data.guidance,
      order: i,
    });
  }

  const framework = await prisma.$transaction(async (tx) => {
    const created = await tx.framework.create({
      data: {
        name: meta.data.name,
        version: meta.data.version,
        description: meta.data.description,
      },
    });

    await tx.control.createMany({
      data: controls.map((control) => ({
        frameworkId: created.id,
        domain: control.domain,
        code: control.code,
        title: control.title,
        guidance: control.guidance,
        order: control.order,
      })),
    });

    return created;
  });

  await logAudit(user.id, "CREATE_FRAMEWORK", "Framework", framework.id);

  revalidatePath("/frameworks");

  return {
    ok: true,
    message: `Imported "${framework.name} v${framework.version}" with ${controls.length} controls.`,
    frameworkId: framework.id,
  };
}
