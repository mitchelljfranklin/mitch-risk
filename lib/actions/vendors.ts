"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createVendor, deleteVendor, updateVendor } from "@/lib/db/vendors";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/actions/helpers";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
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
  await deleteVendor(vendorId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "DELETE_VENDOR", "Vendor", vendorId);
  }
  redirect("/vendors");
}

export type VendorsImportState =
  | { ok: true; message: string; count: number; errors?: undefined }
  | { ok: false; error: string; count?: undefined }
  | undefined;

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(current);
      current = "";
    } else if (char === "\n") {
      row.push(current);
      current = "";
      if (row.length > 0) {
        rows.push(row);
        row = [];
      }
    } else if (char === "\r") {
      // skip
    } else {
      current += char;
    }
  }

  row.push(current);
  if (row.length > 0 && row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const result: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (values.length === 0 || values.every((v) => v.trim() === "")) continue;
    const entry: Record<string, string> = {};
    headers.forEach((h, j) => {
      entry[h] = (values[j] ?? "").trim();
    });
    result.push(entry);
  }

  return result;
}

export async function importVendorsAction(
  previousState: VendorsImportState,
  formData: FormData,
): Promise<VendorsImportState> {
  await requirePermission(PERMISSIONS.VENDORS_CREATE);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return {
      ok: false,
      error: "No rows found in CSV. The first row must be a header.",
    };
  }

  const vendors: VendorInput[] = [];
  const rowErrors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const parsed = vendorCsvRowSchema.safeParse({
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
    });

    if (parsed.success) {
      const vendorInput: VendorInput = {
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
        ownerId: "",
      };
      vendors.push(vendorInput);
    } else {
      rowErrors.push(
        `Row ${i + 2}: ${parsed.error.issues[0]?.message ?? "invalid"}`,
      );
    }
  }

  if (vendors.length === 0) {
    return {
      ok: false,
      error:
        "No valid vendors found. First error: " + (rowErrors[0] ?? "unknown"),
    };
  }

  let createdCount = 0;
  const user = await getCurrentUser();

  for (const vendorInput of vendors) {
    try {
      const vendor = await createVendor(vendorInput);
      if (user) {
        await logAudit(user.id, "IMPORT_VENDOR", "Vendor", vendor.id);
      }
      createdCount++;
    } catch (err) {
      rowErrors.push(
        `${vendorInput.name}: ${err instanceof Error ? err.message : "failed"}`,
      );
    }
  }

  revalidatePath("/vendors");

  if (rowErrors.length > 0) {
    return {
      ok: true,
      message: `Imported ${createdCount} vendor${createdCount !== 1 ? "s" : ""}. ${rowErrors.length} row${rowErrors.length !== 1 ? "s" : ""} skipped.`,
      count: createdCount,
    };
  }

  return {
    ok: true,
    message: `Imported ${createdCount} vendor${createdCount !== 1 ? "s" : ""}.`,
    count: createdCount,
  };
}

const ALLOWED_ATTACHMENT_EXTS = ["pdf", "png", "jpg", "jpeg", "docx", "xlsx"];
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export async function addVendorAttachmentAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.VENDORS_EDIT);

  const vendorId = getField(formData, "vendorId");
  const file = formData.get("attachmentFile") as File | null;

  if (!vendorId || !file || !(file instanceof File) || file.size === 0) return;

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_ATTACHMENT_EXTS.includes(ext)) return;

  if (file.size > MAX_ATTACHMENT_BYTES) return;

  const buffer = Buffer.from(await file.arrayBuffer());
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
}

export async function removeVendorAttachmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.VENDORS_EDIT);

  const attachmentId = getField(formData, "attachmentId");
  const vendorId = getField(formData, "vendorId");
  if (!attachmentId || !vendorId) return;

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
  revalidatePath(`/vendors/${vendorId}`);
}

export async function attachEvidenceToCertificationAction(
  _previousState: { ok: boolean; message: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const user = await requirePermission(PERMISSIONS.VENDORS_EDIT);

  const evidenceId = getField(formData, "evidenceId");
  const name = getField(formData, "name").trim();
  const issuer = getField(formData, "issuer").trim() || undefined;
  const expiresDate = getField(formData, "expiresDate");
  const notes = getField(formData, "notes").trim() || undefined;
  const displayName = getField(formData, "displayName").trim();

  if (!evidenceId) return { ok: false, message: "Missing evidence." };
  if (!name) return { ok: false, message: "Certification name is required." };
  if (!expiresDate) return { ok: false, message: "Expiry date is required." };

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

  const certification = await prisma.vendorCertification.create({
    data: {
      vendorId,
      name,
      issuer,
      expiresDate: new Date(expiresDate),
      notes,
    },
  });

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
