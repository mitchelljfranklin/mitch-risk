"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createCertification,
  deleteCertification,
  deleteAttachmentsForEntity,
  getCertification,
  listAttachments,
  updateCertification,
} from "@/lib/db/certifications";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { certificationSchema } from "@/lib/schemas/certification";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  ALLOWED_ATTACHMENT_EXTS,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/upload-validation";

export type CertificationActionState =
  { ok: boolean; message: string } | undefined;

export async function saveCertificationAction(
  previousState: CertificationActionState,
  formData: FormData,
): Promise<CertificationActionState> {
  await requirePermission(PERMISSIONS.VENDORS_EDIT);

  const vendorId = getField(formData, "vendorId");
  const certificationId = getField(formData, "certificationId");
  if (!vendorId) {
    return { ok: false, message: "Missing vendor." };
  }

  const parsed = certificationSchema.safeParse({
    name: getField(formData, "name"),
    issuer: getField(formData, "issuer"),
    issuedDate: getField(formData, "issuedDate"),
    expiresDate: getField(formData, "expiresDate"),
    notes: getField(formData, "notes"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const user = await getCurrentUser();

  let savedId: string | undefined;

  if (certificationId) {
    await updateCertification(certificationId, parsed.data);
    savedId = certificationId;
    if (user) {
      await logAudit(
        user.id,
        "UPDATE_CERTIFICATION",
        "VendorCertification",
        certificationId,
      );
    }
  } else {
    const created = await createCertification(vendorId, parsed.data);
    savedId = created.id;
    if (user) {
      await logAudit(
        user.id,
        "CREATE_CERTIFICATION",
        "VendorCertification",
        created.id,
      );
    }
  }

  await handleAttachmentUpload(formData, "VendorCertification", savedId);

  return { ok: true, message: "Certification saved." };
}

export async function deleteCertificationAction(formData: FormData) {
  await requirePermission(PERMISSIONS.VENDORS_EDIT);
  const certificationId = getField(formData, "certificationId");
  if (!certificationId) {
    return;
  }
  const existing = await getCertification(certificationId);
  if (!existing) {
    return;
  }

  const attachments = await listAttachments(
    "VendorCertification",
    certificationId,
  );
  for (const a of attachments) {
    try {
      await storage.delete(a.storageKey);
    } catch {
      // file already gone
    }
  }

  await deleteCertification(certificationId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      "DELETE_CERTIFICATION",
      "VendorCertification",
      certificationId,
    );
  }
  revalidatePath(`/vendors/${existing.vendorId}`);
}

export async function handleAttachmentUpload(
  formData: FormData,
  entityType: string,
  entityId: string,
) {
  const file = formData.get("attachmentFile") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) return;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_ATTACHMENT_EXTS.includes(ext)) return;

  if (file.size > MAX_ATTACHMENT_BYTES) return;

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = `attachment-${randomBytes(12).toString("hex")}.${ext}`;

  await storage.save(storageKey, buffer);

  try {
    await prisma.attachment.create({
      data: {
        entityType,
        entityId,
        fileName: file.name,
        storageKey,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
    });
  } catch {
    try {
      await storage.delete(storageKey);
    } catch {
      // clean up failed
    }
  }
}

export async function removeAttachmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.VENDORS_EDIT);

  const attachmentId = getField(formData, "attachmentId");
  if (!attachmentId) return;

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment) return;

  try {
    await storage.delete(attachment.storageKey);
  } catch {
    // file already gone
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/vendors/${attachment.entityId}`);
}
