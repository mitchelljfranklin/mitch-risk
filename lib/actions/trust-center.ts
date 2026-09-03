"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { type z } from "zod";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { prisma } from "@/lib/prisma";
import {
  createTrustBadge,
  createTrustDocument,
  createTrustSection,
  createTrustSubprocessor,
  deleteTrustBadge,
  deleteTrustDocument,
  deleteTrustSection,
  deleteTrustSubprocessor,
  getTrustBadge,
  replaceTrustDocumentFile,
  setTrustBadgeImage,
  updateTrustBadge,
  updateTrustDocument,
  updateTrustSection,
  updateTrustSubprocessor,
} from "@/lib/db/trust-center";
import {
  MAX_TRUST_CENTER_IMAGE_BYTES,
  TRUST_CENTER_IMAGE_EXTS,
  trustCenterBadgeSchema,
  trustCenterDocumentSchema,
  trustCenterSectionSchema,
  trustCenterSubprocessorSchema,
} from "@/lib/schemas/trust-center";
import {
  ALLOWED_ATTACHMENT_EXTS,
  MAX_ATTACHMENT_BYTES,
  isDangerousUploadMime,
  validateMagicBytes,
} from "@/lib/upload-validation";
import { storage } from "@/lib/storage";
import { getField } from "@/lib/utils";

export type TrustCenterActionState =
  { ok: boolean; message: string } | undefined;

function refreshTrustPaths(): void {
  // The public page reads published rows on every request; the manager page
  // renders the same lists.
  revalidatePath("/trust-center");
  revalidatePath("/trust");
}

// Generic form -> zod bridge: text fields pass through, checkboxes are
// absent when unchecked so they must be materialised explicitly.
function parseForm<T>(
  schema: z.ZodType<T>,
  formData: FormData,
  boolFields: string[],
): { ok: true; data: T } | { ok: false; message: string } {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    raw[key] = value;
  }
  for (const field of boolFields) {
    raw[field] = formData.get(field) !== null;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  return { ok: true, data: parsed.data };
}

async function recordAudit(entityId: string): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_TRUST_CENTER,
      "TrustCenter",
      entityId,
    );
  }
}

async function saveBadgeImage(
  file: File | null,
): Promise<{ ok: true; imageKey: string } | { ok: false; message: string }> {
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: true, imageKey: "" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!TRUST_CENTER_IMAGE_EXTS.includes(ext)) {
    return {
      ok: false,
      message:
        "Badge images must be PNG, JPG, GIF or WebP (SVG is not allowed).",
    };
  }
  if (file.size > MAX_TRUST_CENTER_IMAGE_BYTES) {
    return {
      ok: false,
      message: `Badge image is too large (max ${MAX_TRUST_CENTER_IMAGE_BYTES / (1024 * 1024)} MB).`,
    };
  }
  if (isDangerousUploadMime(file.type)) {
    return { ok: false, message: "This file type is not accepted." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(ext, buffer)) {
    return { ok: false, message: "This image file is not valid." };
  }

  const imageKey = `trust-badge-${randomBytes(12).toString("hex")}.${ext}`;
  await storage.save(imageKey, buffer);
  return { ok: true, imageKey };
}

// --- badges ---

export async function saveTrustBadgeAction(
  _previousState: TrustCenterActionState,
  formData: FormData,
): Promise<TrustCenterActionState> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);

  const parsed = parseForm(trustCenterBadgeSchema, formData, ["published"]);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const id = getField(formData, "id");
  const imageFile = formData.get("imageFile");
  const image =
    imageFile instanceof File && imageFile.size > 0
      ? await saveBadgeImage(imageFile)
      : { ok: true as const, imageKey: "" };

  if (!image.ok) return { ok: false, message: image.message };

  try {
    if (id) {
      const existing = await getTrustBadge(id);
      if (!existing) return { ok: false, message: "Badge not found." };

      await updateTrustBadge(id, parsed.data);
      if (image.imageKey) {
        if (existing.imageKey) {
          // Replaced image: remove the old file after the record is updated.
          await storage.delete(existing.imageKey).catch(() => {
            // Best-effort; the orphan sweep is the backstop.
          });
        }
        await setTrustBadgeImage(id, image.imageKey);
      }
    } else {
      const badge = await createTrustBadge(parsed.data);
      if (image.imageKey) {
        await setTrustBadgeImage(badge.id, image.imageKey);
      }
    }
    await recordAudit(id || "new");
  } catch (error: unknown) {
    // Roll back the just-saved image if the record write failed.
    if (image.imageKey) {
      await storage.delete(image.imageKey).catch(() => {
        // Best-effort.
      });
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Save failed.",
    };
  }

  refreshTrustPaths();
  return { ok: true, message: "Badge saved." };
}

export async function deleteTrustBadgeAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const id = getField(formData, "id");
  if (!id) return;
  await deleteTrustBadge(id);
  await recordAudit(id);
  refreshTrustPaths();
}

// --- documents ---

export async function saveTrustDocumentAction(
  _previousState: TrustCenterActionState,
  formData: FormData,
): Promise<TrustCenterActionState> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);

  const parsed = parseForm(trustCenterDocumentSchema, formData, ["published"]);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const id = getField(formData, "id");
  const file = formData.get("file");

  try {
    if (id) {
      await updateTrustDocument(id, parsed.data);
      if (file instanceof File && file.size > 0) {
        const prepared = await prepareTrustDocumentFile(file);
        await persistTrustDocumentFile(id, prepared);
      }
    } else {
      if (!(file instanceof File) || file.size === 0) {
        return { ok: false, message: "A document file is required." };
      }
      // Validate the upload BEFORE creating the record so a rejected file
      // never leaves an orphan document row behind.
      const prepared = await prepareTrustDocumentFile(file);
      const document = await createTrustDocument(parsed.data);
      try {
        await persistTrustDocumentFile(document.id, prepared);
      } catch (persistError: unknown) {
        // Roll back the document row; the file was already rolled back.
        await prisma.trustCenterDocument
          .delete({ where: { id: document.id } })
          .catch(() => {
            // Best-effort.
          });
        throw persistError instanceof Error
          ? persistError
          : new Error("Failed to save file.");
      }
    }
    await recordAudit(id || "new");
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Save failed.",
    };
  }

  refreshTrustPaths();
  return { ok: true, message: "Document saved." };
}

// Validates then prepares a document file with the shared upload rules:
// extension allowlist, size cap, magic bytes. Pure validation + buffer read
// so callers can reject before creating any records.
async function prepareTrustDocumentFile(file: File): Promise<{
  fileName: string;
  buffer: Buffer;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_ATTACHMENT_EXTS.includes(ext)) {
    throw new Error("File type not allowed.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `File is too large (max ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB).`,
    );
  }
  if (isDangerousUploadMime(file.type)) {
    throw new Error("This file type is not accepted.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(ext, buffer)) {
    throw new Error("This file type is not accepted.");
  }

  return {
    fileName: file.name,
    buffer,
    storageKey: `attachment-${randomBytes(12).toString("hex")}.${ext}`,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}

// Saves the prepared file and swaps the document's attachment row. Old file
// deleted only after the new row commits; rolled back if storage fails.
async function persistTrustDocumentFile(
  documentId: string,
  prepared: Awaited<ReturnType<typeof prepareTrustDocumentFile>>,
): Promise<void> {
  await storage.save(prepared.storageKey, prepared.buffer);

  try {
    await replaceTrustDocumentFile(documentId, {
      fileName: prepared.fileName,
      storageKey: prepared.storageKey,
      mimeType: prepared.mimeType,
      sizeBytes: prepared.sizeBytes,
    });
  } catch (error: unknown) {
    await storage.delete(prepared.storageKey).catch(() => {
      // Best-effort rollback.
    });
    throw error instanceof Error ? error : new Error("Failed to save file.");
  }
}

export async function deleteTrustDocumentAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const id = getField(formData, "id");
  if (!id) return;
  await deleteTrustDocument(id);
  await recordAudit(id);
  refreshTrustPaths();
}

// --- subprocessors ---

export async function saveTrustSubprocessorAction(
  _previousState: TrustCenterActionState,
  formData: FormData,
): Promise<TrustCenterActionState> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);

  const parsed = parseForm(trustCenterSubprocessorSchema, formData, [
    "published",
  ]);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const id = getField(formData, "id");
  try {
    if (id) {
      await updateTrustSubprocessor(id, parsed.data);
    } else {
      await createTrustSubprocessor(parsed.data);
    }
    await recordAudit(id || "new");
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Save failed.",
    };
  }

  refreshTrustPaths();
  return { ok: true, message: "Subprocessor saved." };
}

export async function deleteTrustSubprocessorAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const id = getField(formData, "id");
  if (!id) return;
  await deleteTrustSubprocessor(id);
  await recordAudit(id);
  refreshTrustPaths();
}

// --- sections ---

export async function saveTrustSectionAction(
  _previousState: TrustCenterActionState,
  formData: FormData,
): Promise<TrustCenterActionState> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);

  const parsed = parseForm(trustCenterSectionSchema, formData, ["published"]);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const id = getField(formData, "id");
  try {
    if (id) {
      await updateTrustSection(id, parsed.data);
    } else {
      await createTrustSection(parsed.data);
    }
    await recordAudit(id || "new");
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Save failed.",
    };
  }

  refreshTrustPaths();
  return { ok: true, message: "Section saved." };
}

export async function deleteTrustSectionAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const id = getField(formData, "id");
  if (!id) return;
  await deleteTrustSection(id);
  await recordAudit(id);
  refreshTrustPaths();
}
