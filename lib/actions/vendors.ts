"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createVendor, deleteVendor, updateVendor } from "@/lib/db/vendors";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  ALLOWED_ATTACHMENT_EXTS,
  MAX_ATTACHMENT_BYTES,
  validateMagicBytes,
} from "@/lib/upload-validation";
import { parseCsvWithHeaders } from "@/lib/csv-parser";
import { generateResponsibilityActions } from "@/lib/actions/certifications";
import {
  vendorSchema,
  vendorCsvRowSchema,
  type VendorInput,
} from "@/lib/schemas/vendor";

export type VendorFormState =
  { error: string } | { ok: true; message: string } | undefined;

export async function createVendorAction(
  previousState: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  await requirePermission(PERMISSIONS.VENDORS_CREATE);
  const parsed = vendorSchema.safeParse({
    name: getField(formData, "name"),
    contactName: getField(formData, "contactName"),
    contactEmail: getField(formData, "contactEmail"),
    tier: getField(formData, "tier"),
    website: getField(formData, "website"),
    notes: getField(formData, "notes"),
    serviceDescription: getField(formData, "serviceDescription"),
    dataSensitivity: getField(formData, "dataSensitivity"),
    contractRenewalDate: getField(formData, "contractRenewalDate"),
    contractValue: getField(formData, "contractValue"),
    geographicRisk: getField(formData, "geographicRisk"),
    tags: getField(formData, "tags")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    ownerId: getField(formData, "ownerId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const vendor = await createVendor(parsed.data);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "CREATE_VENDOR", "Vendor", vendor.id);
  }
  redirect(`/vendors/${vendor.id}?created=1`);
}

export async function updateVendorAction(
  previousState: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  await requirePermission(PERMISSIONS.VENDORS_EDIT);
  const vendorId = getField(formData, "vendorId");
  const parsed = vendorSchema.safeParse({
    name: getField(formData, "name"),
    contactName: getField(formData, "contactName"),
    contactEmail: getField(formData, "contactEmail"),
    tier: getField(formData, "tier"),
    website: getField(formData, "website"),
    notes: getField(formData, "notes"),
    serviceDescription: getField(formData, "serviceDescription"),
    dataSensitivity: getField(formData, "dataSensitivity"),
    contractRenewalDate: getField(formData, "contractRenewalDate"),
    contractValue: getField(formData, "contractValue"),
    geographicRisk: getField(formData, "geographicRisk"),
    tags: getField(formData, "tags")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    ownerId: getField(formData, "ownerId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await updateVendor(vendorId, parsed.data);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "UPDATE_VENDOR", "Vendor", vendorId);
  }
  revalidatePath(`/vendors/${vendorId}`);
  return { ok: true, message: "Vendor updated." };
}

export async function deleteVendorAction(formData: FormData) {
  await requirePermission(PERMISSIONS.VENDORS_DELETE);
  const vendorId = getField(formData, "vendorId");
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "DELETE_VENDOR", "Vendor", vendorId);
  }
  await deleteVendor(vendorId);
  redirect("/vendors");
}

export type VendorsImportState =
  | { ok: true; message: string; count: number; errors?: undefined }
  | { ok: false; error: string; count?: undefined }
  | undefined;

export async function importVendorsAction(
  previousState: VendorsImportState,
  formData: FormData,
): Promise<VendorsImportState> {
  await requirePermission(PERMISSIONS.VENDORS_CREATE);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }

  if (file.size > 1_000_000) {
    return { ok: false, error: "File is too large (max 1 MB)." };
  }

  const text = await file.text();
  const rows = parseCsvWithHeaders(text);
  if (rows.length === 0) {
    return {
      ok: false,
      error: "No rows found in CSV. The first row must be a header.",
    };
  }

  const vendorRows: { id: string; input: VendorInput }[] = [];
  const rowErrors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const parsed = vendorCsvRowSchema.safeParse({
      id: raw.id ?? raw.ID ?? "",
      name: raw.name ?? "",
      contactName: raw.contactname ?? raw.contactName ?? "",
      contactEmail: raw.contactemail ?? raw.contactEmail ?? "",
      tier: raw.tier ?? "",
      website: raw.website ?? "",
      notes: raw.notes ?? "",
      serviceDescription:
        raw.servicedescription ?? raw.serviceDescription ?? "",
      dataSensitivity: raw.datasensitivity ?? raw.dataSensitivity ?? "",
      contractRenewalDate:
        raw.contractrenewaldate ?? raw.contractRenewalDate ?? "",
      contractValue: raw.contractvalue ?? raw.contractValue ?? "",
      geographicRisk: raw.geographicrisk ?? raw.geographicRisk ?? "",
      tags: raw.tags ?? "",
    });

    if (parsed.success) {
      vendorRows.push({
        id: parsed.data.id,
        input: {
          name: parsed.data.name,
          contactName: parsed.data.contactName,
          contactEmail: parsed.data.contactEmail,
          tier: parsed.data.tier as VendorInput["tier"],
          website: parsed.data.website,
          notes: parsed.data.notes,
          serviceDescription: parsed.data.serviceDescription,
          dataSensitivity: parsed.data
            .dataSensitivity as VendorInput["dataSensitivity"],
          contractRenewalDate: parsed.data.contractRenewalDate,
          contractValue: parsed.data.contractValue,
          geographicRisk: parsed.data.geographicRisk,
          tags: parsed.data.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          ownerId: "",
        },
      });
    } else {
      rowErrors.push(
        `Row ${i + 2}: ${parsed.error.issues[0]?.message ?? "invalid"}`,
      );
    }
  }

  if (vendorRows.length === 0) {
    return {
      ok: false,
      error:
        "No valid vendors found. First error: " + (rowErrors[0] ?? "unknown"),
    };
  }

  let createdCount = 0;
  let updatedCount = 0;
  const user = await getCurrentUser();

  for (const { id, input } of vendorRows) {
    try {
      if (id) {
        const existing = await prisma.vendor.findUnique({
          where: { id },
          select: { id: true },
        });
        if (existing) {
          await updateVendor(id, input);
          if (user) {
            await logAudit(user.id, "UPDATE_VENDOR", "Vendor", id);
          }
          updatedCount++;
          continue;
        }
      }
      const vendor = await createVendor(input);
      if (user) {
        await logAudit(user.id, "IMPORT_VENDOR", "Vendor", vendor.id);
      }
      createdCount++;
    } catch (error) {
      rowErrors.push(
        `${input.name}: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  revalidatePath("/vendors");

  const parts: string[] = [];
  if (createdCount > 0) {
    parts.push(`${createdCount} created`);
  }
  if (updatedCount > 0) {
    parts.push(`${updatedCount} updated`);
  }
  if (rowErrors.length > 0) {
    parts.push(
      `${rowErrors.length} row${rowErrors.length !== 1 ? "s" : ""} skipped`,
    );
  }

  return {
    ok: true,
    message: `Import complete: ${parts.join(", ")}.`,
    count: createdCount + updatedCount,
  };
}

export async function addVendorAttachmentAction(
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const user = await requirePermission(PERMISSIONS.VENDORS_EDIT);

  const vendorId = getField(formData, "vendorId");
  const file = formData.get("attachmentFile") as File | null;

  if (!vendorId || !file || !(file instanceof File) || file.size === 0) {
    return { ok: false, message: "No file selected." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_ATTACHMENT_EXTS.includes(ext)) {
    return { ok: false, message: "File type not allowed." };
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      message: `File is too large (max ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB).`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(ext, buffer)) {
    return { ok: false, message: "This file type is not accepted." };
  }
  const storageKey = `attachment-${randomBytes(12).toString("hex")}.${ext}`;

  await storage.save(storageKey, buffer);

  await prisma.attachment.create({
    data: {
      entityType: "Vendor",
      entityId: vendorId,
      fileName: file.name,
      storageKey,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    },
  });

  if (user) {
    await logAudit(user.id, "UPDATE_VENDOR", "Vendor", vendorId);
  }

  revalidatePath(`/vendors/${vendorId}`);
  return { ok: true, message: "File uploaded." };
}

export async function removeVendorAttachmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.VENDORS_EDIT);

  const attachmentId = getField(formData, "attachmentId");
  const vendorId = getField(formData, "vendorId");
  if (!attachmentId || !vendorId) return;

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  });
  if (
    !attachment ||
    attachment.entityType !== "Vendor" ||
    attachment.entityId !== vendorId
  ) {
    return;
  }

  try {
    await storage.delete(attachment.storageKey);
  } catch {
    // file already gone
  }

  await prisma.attachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/vendors/${vendorId}`);
}
async function handleGeneralAttachment(
  formData: FormData,
  vendorId: string,
  evidenceId: string,
  evidence: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    assessmentId: string;
  },
  newKey: string,
  user: { id: string } | null,
) {
  const displayName = getField(formData, "displayName").trim();
  const notes = getField(formData, "notes").trim() || undefined;

  await prisma.attachment.create({
    data: {
      entityType: "Vendor",
      entityId: vendorId,
      fileName: evidence.fileName,
      storageKey: newKey,
      mimeType: evidence.mimeType,
      sizeBytes: evidence.sizeBytes,
      displayName: displayName || evidence.fileName,
      notes,
    },
  });

  if (user) {
    await logAudit(user.id, "UPDATE_VENDOR", "Vendor", vendorId, {
      note: "Attached evidence to vendor",
      evidenceId,
    });
  }

  revalidatePath(`/assessments/${evidence.assessmentId}`);
  revalidatePath(`/vendors/${vendorId}`);

  return { ok: true, message: "File attached to vendor." } as const;
}

async function handleCertificationAttachment(
  formData: FormData,
  vendorId: string,
  evidence: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    assessmentId: string;
  },
  newKey: string,
  user: { id: string } | null,
) {
  const name = getField(formData, "name").trim();
  const issuer = getField(formData, "issuer").trim() || undefined;
  const expiresDate = getField(formData, "expiresDate");
  const notes = getField(formData, "notes").trim() || undefined;
  const displayName = getField(formData, "displayName").trim();
  const frameworkName = getField(formData, "frameworkName").trim() || undefined;

  if (!name) return { ok: false, message: "Certification name is required." };
  if (!expiresDate) return { ok: false, message: "Expiry date is required." };

  const certification = await prisma.vendorCertification.create({
    data: { vendorId, name, issuer, expiresDate: new Date(expiresDate), notes },
  });

  await generateResponsibilityActions(
    vendorId,
    certification.id,
    frameworkName,
  );

  await prisma.attachment.create({
    data: {
      entityType: "VendorCertification",
      entityId: certification.id,
      fileName: evidence.fileName,
      storageKey: newKey,
      mimeType: evidence.mimeType,
      sizeBytes: evidence.sizeBytes,
      displayName: displayName || evidence.fileName,
    },
  });

  if (user) {
    await logAudit(user.id, "UPDATE_VENDOR", "Vendor", vendorId, {
      note: "Created certification with attached evidence",
      certificationId: certification.id,
    });
  }

  revalidatePath(`/assessments/${evidence.assessmentId}`);
  revalidatePath(`/vendors/${vendorId}`);

  return {
    ok: true,
    message: `Certification "${name}" added with attachment.`,
  };
}

export async function attachEvidenceToCertificationAction(
  _previousState: { ok: boolean; message: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const user = await requirePermission(PERMISSIONS.VENDORS_EDIT);

  const evidenceId = getField(formData, "evidenceId");
  const attachType = getField(formData, "attachType");

  if (!evidenceId) return { ok: false, message: "Missing evidence." };

  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId },
    include: { assessment: { select: { vendorId: true } } },
  });
  if (!evidence) return { ok: false, message: "Evidence not found." };

  const vendorId = evidence.assessment.vendorId;
  const file = await storage.read(evidence.storageKey);
  const ext = evidence.fileName.split(".").pop() ?? "dat";
  const newKey = `attachment-${randomBytes(12).toString("hex")}.${ext}`;

  await storage.save(newKey, file);

  if (attachType === "general") {
    return handleGeneralAttachment(
      formData,
      vendorId,
      evidenceId,
      evidence,
      newKey,
      user,
    );
  }

  return handleCertificationAttachment(
    formData,
    vendorId,
    evidence,
    newKey,
    user,
  );
}
