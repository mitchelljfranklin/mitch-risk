"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser, getCurrentUser } from "@/lib/auth";
import { createVendor, deleteVendor, updateVendor } from "@/lib/db/vendors";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/actions/helpers";
import { vendorSchema } from "@/lib/schemas/vendor";

export type VendorFormState = { error: string } | undefined;

export async function createVendorAction(
  previousState: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  await requireUser();
  const parsed = vendorSchema.safeParse({
    name: getField(formData, "name"),
    contactName: getField(formData, "contactName"),
    contactEmail: getField(formData, "contactEmail"),
    tier: getField(formData, "tier"),
    website: getField(formData, "website"),
    notes: getField(formData, "notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const vendor = await createVendor(parsed.data);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "CREATE_VENDOR", "Vendor", vendor.id);
  }
  redirect(`/vendors/${vendor.id}`);
}

export async function updateVendorAction(
  previousState: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  await requireUser();
  const vendorId = getField(formData, "vendorId");
  const parsed = vendorSchema.safeParse({
    name: getField(formData, "name"),
    contactName: getField(formData, "contactName"),
    contactEmail: getField(formData, "contactEmail"),
    tier: getField(formData, "tier"),
    website: getField(formData, "website"),
    notes: getField(formData, "notes"),
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
  return undefined;
}

export async function deleteVendorAction(formData: FormData) {
  await requireUser();
  const vendorId = getField(formData, "vendorId");
  await deleteVendor(vendorId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "DELETE_VENDOR", "Vendor", vendorId);
  }
  redirect("/vendors");
}

export type VendorImportState =
  | { ok: true; message: string; error?: undefined }
  | { ok: false; error: string; message?: undefined }
  | undefined;

export async function importVendorAction(
  previousState: VendorImportState,
  formData: FormData,
): Promise<VendorImportState> {
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }

  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "Invalid JSON file." };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Invalid vendor structure." };
  }

  const record = data as Record<string, unknown>;
  const parsed = vendorSchema.safeParse({
    name: record.name ?? "",
    contactName: record.contactName ?? "",
    contactEmail: record.contactEmail ?? "",
    tier: record.tier ?? "",
    website: record.website ?? "",
    notes: record.notes ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid vendor data.",
    };
  }

  const vendor = await createVendor(parsed.data);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "IMPORT_VENDOR", "Vendor", vendor.id);
  }
  revalidatePath("/vendors");
  return { ok: true, message: `Imported "${parsed.data.name}".` };
}
