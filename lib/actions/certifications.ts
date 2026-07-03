"use server";

import { revalidatePath } from "next/cache";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createCertification,
  deleteCertification,
  getCertification,
  updateCertification,
} from "@/lib/db/certifications";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/actions/helpers";
import { certificationSchema } from "@/lib/schemas/certification";

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

  if (certificationId) {
    await updateCertification(certificationId, parsed.data);
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
    if (user) {
      await logAudit(
        user.id,
        "CREATE_CERTIFICATION",
        "VendorCertification",
        created.id,
      );
    }
  }

  revalidatePath(`/vendors/${vendorId}`);
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
