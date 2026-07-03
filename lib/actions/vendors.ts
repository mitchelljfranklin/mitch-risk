"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createVendor, deleteVendor, updateVendor } from "@/lib/db/vendors";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/actions/helpers";
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
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length === 0 || values.every((v) => v === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? "";
    });
    rows.push(row);
  }

  return rows;
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
    });

    if (parsed.success) {
      const vendorInput: VendorInput = {
        name: parsed.data.name,
        contactName: parsed.data.contactName,
        contactEmail: parsed.data.contactEmail,
        tier: parsed.data.tier as VendorInput["tier"],
        website: parsed.data.website,
        notes: parsed.data.notes,
        serviceDescription: "",
        dataSensitivity: "",
        contractRenewalDate: "",
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
