"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
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
  getTrustSubprocessor,
  moveTrustBadge,
  moveTrustDocument,
  moveTrustSection,
  moveTrustSubprocessor,
  replaceTrustDocumentFile,
  setTrustBadgeImage,
  setTrustSubprocessorLogo,
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
import { validateWebhookTarget } from "@/lib/webhooks";
import { storage } from "@/lib/storage";
import { getField } from "@/lib/utils";

export type TrustCenterActionState =
  { ok: boolean; message: string } | undefined;

function refreshTrustPaths(): void {
  // The public page reads published rows on every request; the manager page
  // renders the same lists. Save actions consumed by useActionState must NOT
  // call this — revalidatePath inside them aborts the action response
  // streaming on some Node versions (toasts never appear); useActionFeedback
  // refreshes via router.refresh() instead, and /trust is force-dynamic.
  revalidatePath("/trust-center");
  revalidatePath("/trust");
}

// Generic form -> zod bridge: text fields pass through, checkboxes are
// absent when unchecked so they must be materialised explicitly.
type TrustCenterErrorKey =
  | "errors.invalidInput"
  | "errors.titleRequired"
  | "errors.nameRequired"
  | "errors.invalidUrl"
  | "errors.sectionTooLong";

function parseForm<T>(
  schema: z.ZodType<T>,
  formData: FormData,
  boolFields: string[],
  translate: (key: TrustCenterErrorKey) => string,
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
    const path = String(parsed.error.issues[0]?.path[0] ?? "");
    let messageKey: TrustCenterErrorKey = "errors.invalidInput";
    if (path === "title") messageKey = "errors.titleRequired";
    else if (path === "name") messageKey = "errors.nameRequired";
    else if (path === "externalUrl" || path === "websiteUrl") {
      messageKey = "errors.invalidUrl";
    } else if (path === "body") messageKey = "errors.sectionTooLong";
    return { ok: false, message: translate(messageKey) };
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

// Shared raster-image validation for badge and subprocessor images.
type TrustCenterImageMessages = {
  imageType: string;
  imageInvalid: string;
  imageTooLarge: string;
  fileType: string;
  imageFetchFailed: string;
  imageContent: string;
  invalidUrl: string;
};

async function validateImageBuffer(
  buffer: Buffer,
  ext: string,
  messages: TrustCenterImageMessages,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!TRUST_CENTER_IMAGE_EXTS.includes(ext)) {
    return { ok: false, message: messages.imageType };
  }
  if (!validateMagicBytes(ext, buffer)) {
    return { ok: false, message: messages.imageInvalid };
  }
  return { ok: true };
}

async function saveBadgeImage(
  file: File | null,
  keyPrefix: string,
  messages: TrustCenterImageMessages,
): Promise<{ ok: true; imageKey: string } | { ok: false; message: string }> {
  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: true, imageKey: "" };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
    return { ok: false, message: messages.imageType };
  }
  if (file.size > MAX_TRUST_CENTER_IMAGE_BYTES) {
    return { ok: false, message: messages.imageTooLarge };
  }
  if (isDangerousUploadMime(file.type)) {
    return { ok: false, message: messages.fileType };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = await validateImageBuffer(buffer, ext, messages);
  if (!validation.ok) return validation;

  const imageKey = `${keyPrefix}-${randomBytes(12).toString("hex")}.${ext}`;
  await storage.save(imageKey, buffer);
  return { ok: true, imageKey };
}

// Fetches an admin-provided image URL server-side and stores it like an
// upload. This keeps the strict CSP intact (no external image hosts are
// rendered directly) and gates the fetch through the same public-HTTPS
// guard the webhook feature uses, so the URL cannot pivot into the
// internal network. Content is validated by magic bytes exactly like an
// upload, and stored under the given key prefix.
async function fetchAndStoreRemoteImage(
  rawUrl: string,
  prefix: string,
  messages: TrustCenterImageMessages,
): Promise<{ ok: true; imageKey: string } | { ok: false; message: string }> {
  const target = validateWebhookTarget(rawUrl);
  if (!target.ok) return { ok: false, message: messages.invalidUrl };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(rawUrl, {
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok) {
      return { ok: false, message: messages.imageFetchFailed };
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_TRUST_CENTER_IMAGE_BYTES) {
      return { ok: false, message: messages.imageTooLarge };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_TRUST_CENTER_IMAGE_BYTES) {
      return { ok: false, message: messages.imageTooLarge };
    }

    // Derive the extension from the response content type (URLs may omit
    // one); refuse anything outside the raster allowlist.
    const contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]!
      .trim()
      .toLowerCase();
    const extByMime: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/gif": "gif",
      "image/webp": "webp",
    };
    const ext = extByMime[contentType] ?? "";
    if (!ext) {
      return { ok: false, message: messages.imageContent };
    }
    const validation = await validateImageBuffer(buffer, ext, messages);
    if (!validation.ok) return validation;

    const imageKey = `${prefix}-${randomBytes(12).toString("hex")}.${ext}`;
    await storage.save(imageKey, buffer);
    return { ok: true, imageKey };
  } catch {
    return { ok: false, message: messages.imageFetchFailed };
  } finally {
    clearTimeout(timeout);
  }
}

// --- badges ---

export async function saveTrustBadgeAction(
  _previousState: TrustCenterActionState,
  formData: FormData,
): Promise<TrustCenterActionState> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const translations = await getTranslations("TrustCenterManager");
  const imageMessages = {
    imageType: translations("errors.imageType"),
    imageInvalid: translations("errors.imageInvalid"),
    imageTooLarge: translations("errors.imageTooLarge", {
      max: MAX_TRUST_CENTER_IMAGE_BYTES / (1024 * 1024),
    }),
    fileType: translations("errors.fileType"),
    imageFetchFailed: translations("errors.imageFetchFailed"),
    imageContent: translations("errors.imageContent"),
    invalidUrl: translations("errors.invalidUrl"),
  };

  const parsed = parseForm(
    trustCenterBadgeSchema,
    formData,
    ["published"],
    translations,
  );
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const id = getField(formData, "id");
  const imageFile = formData.get("imageFile");
  const image =
    imageFile instanceof File && imageFile.size > 0
      ? await saveBadgeImage(imageFile, "trust-badge", imageMessages)
      : { ok: true as const, imageKey: "" };

  if (!image.ok) return { ok: false, message: image.message };

  try {
    let entityId = id;
    if (id) {
      const existing = await getTrustBadge(id);
      if (!existing) {
        return {
          ok: false,
          message: translations("errors.badgeNotFound"),
        };
      }

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
      entityId = badge.id;
      if (image.imageKey) {
        await setTrustBadgeImage(badge.id, image.imageKey);
      }
    }
    await recordAudit(entityId);
  } catch (error: unknown) {
    // Roll back the just-saved image if the record write failed.
    if (image.imageKey) {
      await storage.delete(image.imageKey).catch(() => {
        // Best-effort.
      });
    }
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : translations("errors.saveFailed"),
    };
  }

  // useActionState-consumed save: no revalidatePath (Node streaming bug +
  // toast race) — useActionFeedback refreshes the manager lists instead.
  return { ok: true, message: translations("errors.badgeSaved") };
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

export async function moveTrustBadgeAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const id = getField(formData, "id");
  const direction = getField(formData, "direction");
  if (!id || (direction !== "up" && direction !== "down")) return;
  await moveTrustBadge(id, direction);
  await recordAudit(id);
  refreshTrustPaths();
}

// --- documents ---

export async function saveTrustDocumentAction(
  _previousState: TrustCenterActionState,
  formData: FormData,
): Promise<TrustCenterActionState> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const translations = await getTranslations("TrustCenterManager");
  const documentMessages = {
    fileType: translations("errors.fileType"),
    fileTooLarge: translations("errors.fileTooLarge", {
      max: MAX_ATTACHMENT_BYTES / (1024 * 1024),
    }),
    fileInvalid: translations("errors.fileInvalid"),
  };

  const parsed = parseForm(
    trustCenterDocumentSchema,
    formData,
    ["published"],
    translations,
  );
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const id = getField(formData, "id");
  const file = formData.get("file");

  let entityId = id;
  try {
    if (id) {
      await updateTrustDocument(id, parsed.data);
      if (file instanceof File && file.size > 0) {
        const prepared = await prepareTrustDocumentFile(file, documentMessages);
        await persistTrustDocumentFile(id, prepared);
      }
    } else {
      if (!(file instanceof File) || file.size === 0) {
        return {
          ok: false,
          message: translations("errors.documentFileRequired"),
        };
      }
      // Validate the upload BEFORE creating the record so a rejected file
      // never leaves an orphan document row behind.
      const prepared = await prepareTrustDocumentFile(file, documentMessages);
      const document = await createTrustDocument(parsed.data);
      entityId = document.id;
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
    await recordAudit(entityId);
  } catch (error: unknown) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : translations("errors.saveFailed"),
    };
  }

  // useActionState-consumed save: no revalidatePath (Node streaming bug +
  // toast race) — useActionFeedback refreshes the manager lists instead.
  return { ok: true, message: translations("errors.documentSaved") };
}

// Validates then prepares a document file with the shared upload rules:
// extension allowlist, size cap, magic bytes. Pure validation + buffer read
// so callers can reject before creating any records.
type TrustCenterDocumentMessages = {
  fileType: string;
  fileTooLarge: string;
  fileInvalid: string;
};

async function prepareTrustDocumentFile(
  file: File,
  messages: TrustCenterDocumentMessages,
): Promise<{
  fileName: string;
  buffer: Buffer;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_ATTACHMENT_EXTS.includes(ext)) {
    throw new Error(messages.fileType);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(messages.fileTooLarge);
  }
  if (isDangerousUploadMime(file.type)) {
    throw new Error(messages.fileType);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(ext, buffer)) {
    throw new Error(messages.fileInvalid);
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

export async function moveTrustDocumentAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const id = getField(formData, "id");
  const direction = getField(formData, "direction");
  if (!id || (direction !== "up" && direction !== "down")) return;
  await moveTrustDocument(id, direction);
  await recordAudit(id);
  refreshTrustPaths();
}

// --- subprocessors ---

export async function saveTrustSubprocessorAction(
  _previousState: TrustCenterActionState,
  formData: FormData,
): Promise<TrustCenterActionState> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const translations = await getTranslations("TrustCenterManager");
  const imageMessages = {
    imageType: translations("errors.imageType"),
    imageInvalid: translations("errors.imageInvalid"),
    imageTooLarge: translations("errors.imageTooLarge", {
      max: MAX_TRUST_CENTER_IMAGE_BYTES / (1024 * 1024),
    }),
    fileType: translations("errors.fileType"),
    imageFetchFailed: translations("errors.imageFetchFailed"),
    imageContent: translations("errors.imageContent"),
    invalidUrl: translations("errors.invalidUrl"),
  };

  const parsed = parseForm(
    trustCenterSubprocessorSchema,
    formData,
    ["published"],
    translations,
  );
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const id = getField(formData, "id");
  const logoFile = formData.get("logoFile");
  const logoUrl = getField(formData, "logoUrl").trim();

  // Resolve the logo: an uploaded file wins over a pasted URL; the URL is
  // fetched and stored server-side so the public page never renders
  // external hosts directly.
  let newLogoKey: string | undefined;
  if (logoFile instanceof File && logoFile.size > 0) {
    const image = await saveBadgeImage(
      logoFile,
      "trust-subprocessor",
      imageMessages,
    );
    if (!image.ok) return { ok: false, message: image.message };
    if (image.imageKey) newLogoKey = image.imageKey;
  } else if (logoUrl) {
    const fetched = await fetchAndStoreRemoteImage(
      logoUrl,
      "trust-subprocessor",
      imageMessages,
    );
    if (!fetched.ok) return { ok: false, message: fetched.message };
    newLogoKey = fetched.imageKey;
  }

  try {
    let subprocessorId = id;
    if (id) {
      await updateTrustSubprocessor(id, parsed.data);
    } else {
      const created = await createTrustSubprocessor(parsed.data);
      subprocessorId = created.id;
    }
    if (newLogoKey && subprocessorId) {
      const existing = await getTrustSubprocessor(subprocessorId);
      if (existing?.logoKey) {
        // Replaced logo: remove the old file after the record is updated.
        await storage.delete(existing.logoKey).catch(() => {
          // Best-effort; the orphan sweep is the backstop.
        });
      }
      await setTrustSubprocessorLogo(subprocessorId, newLogoKey);
    }
    await recordAudit(subprocessorId);
  } catch (error: unknown) {
    // Roll back the just-stored logo if the record write failed.
    if (newLogoKey) {
      await storage.delete(newLogoKey).catch(() => {
        // Best-effort.
      });
    }
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : translations("errors.saveFailed"),
    };
  }

  // useActionState-consumed save: no revalidatePath (Node streaming bug +
  // toast race) — useActionFeedback refreshes the manager lists instead.
  return { ok: true, message: translations("errors.subprocessorSaved") };
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

export async function moveTrustSubprocessorAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const id = getField(formData, "id");
  const direction = getField(formData, "direction");
  if (!id || (direction !== "up" && direction !== "down")) return;
  await moveTrustSubprocessor(id, direction);
  await recordAudit(id);
  refreshTrustPaths();
}

// --- sections ---

export async function saveTrustSectionAction(
  _previousState: TrustCenterActionState,
  formData: FormData,
): Promise<TrustCenterActionState> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const translations = await getTranslations("TrustCenterManager");

  const parsed = parseForm(
    trustCenterSectionSchema,
    formData,
    ["published"],
    translations,
  );
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const id = getField(formData, "id");
  let entityId = id;
  try {
    if (id) {
      await updateTrustSection(id, parsed.data);
    } else {
      const created = await createTrustSection(parsed.data);
      entityId = created.id;
    }
    await recordAudit(entityId);
  } catch (error: unknown) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : translations("errors.saveFailed"),
    };
  }

  // useActionState-consumed save: no revalidatePath (Node streaming bug +
  // toast race) — useActionFeedback refreshes the manager lists instead.
  return { ok: true, message: translations("errors.sectionSaved") };
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

export async function moveTrustSectionAction(
  formData: FormData,
): Promise<void> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const id = getField(formData, "id");
  const direction = getField(formData, "direction");
  if (!id || (direction !== "up" && direction !== "down")) return;
  await moveTrustSection(id, direction);
  await recordAudit(id);
  refreshTrustPaths();
}
