"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit";
import { updateAction } from "@/lib/db/customer-responsibility";
import { getField } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  ALLOWED_ATTACHMENT_EXTS,
  MAX_ATTACHMENT_BYTES,
  validateMagicBytes,
} from "@/lib/upload-validation";

export async function updateResponsibilityAction(
  _previousState: { ok: boolean; message: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; message: string } | undefined> {
  await requirePermission(PERMISSIONS.VENDORS_EDIT);

  const actionId = getField(formData, "actionId");
  const vendorId = getField(formData, "vendorId");
  const status = getField(formData, "status");
  const assignedToId = getField(formData, "assignedToId");
  const notes = getField(formData, "notes");

  if (!actionId || !vendorId) {
    return { ok: false, message: "Missing required fields." };
  }

  const data: Record<string, unknown> = {};

  if (status) {
    if (!["PENDING", "IN_PROGRESS", "COMPLETED", "NOT_APPLICABLE"].includes(status)) {
      return { ok: false, message: "Invalid status." };
    }
    data.status = status;
    data.completedAt = status === "COMPLETED" ? new Date() : null;
  }

  if (formData.has("assignedToId")) {
    data.assignedToId = assignedToId || null;
  }

  if (formData.has("notes")) {
    data.notes = notes || null;
  }

  if (Object.keys(data).length === 0 && !formData.get("attachmentFile")) {
    return { ok: false, message: "No changes provided." };
  }

  if (Object.keys(data).length > 0) {
    await updateAction(actionId, data);
    const user = await getCurrentUser();
    if (user) {
      await logAudit(
        user.id,
        "UPDATE_RESPONSIBILITY_ACTION",
        "CustomerResponsibilityAction",
        actionId,
        status ? { status } : undefined,
      );
    }
  }

  await handleAttachmentUpload(formData, "CustomerResponsibilityAction", actionId);

  revalidatePath(`/vendors/${vendorId}`);

  return { ok: true, message: "Saved." };
}

async function handleAttachmentUpload(
  formData: FormData,
  entityType: string,
  entityId: string,
): Promise<void> {
  const file = formData.get("attachmentFile") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) return;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_ATTACHMENT_EXTS.includes(ext)) return;

  if (file.size > MAX_ATTACHMENT_BYTES) return;

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(ext, buffer)) return;

  const storageKey = `responsibility-${randomBytes(12).toString("hex")}.${ext}`;

  await storage.save(storageKey, buffer);

  try {
    await prisma.attachment.create({
      data: {
        entityType,
        entityId,
        fileName: file.name,
        displayName: file.name,
        storageKey,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
    });
  } catch (error: unknown) {
    console.error(
      "Failed to create responsibility attachment:",
      error instanceof Error ? error.message : String(error),
    );
    try {
      await storage.delete(storageKey);
    } catch {
      // storage cleanup failed — orphaned file will be swept by cron
    }
  }
}

export async function removeResponsibilityAttachment(formData: FormData) {
  await requirePermission(PERMISSIONS.VENDORS_EDIT);

  const attachmentId = getField(formData, "attachmentId");
  const vendorId = getField(formData, "vendorId");
  if (!attachmentId || !vendorId) return;

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment) return;

  if (attachment.entityType !== "CustomerResponsibilityAction") return;

  try {
    await storage.delete(attachment.storageKey);
  } catch {
    // file already gone
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/vendors/${vendorId}`);
}
