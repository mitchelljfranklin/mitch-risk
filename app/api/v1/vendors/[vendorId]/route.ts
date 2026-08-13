import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendor, updateVendor, deleteVendor } from "@/lib/db/vendors";
import { getVendorProfile } from "@/lib/db/compliance";
import { getCustomerResponsibilityCompliance } from "@/lib/db/customer-responsibility";
import { vendorSchema } from "@/lib/schemas/vendor";
import { buildVendorDetailResponse } from "@/lib/api/vendor-detail";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return apiError("Unauthorized", 401);
    }
    if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_VIEW)) {
      return apiError("Forbidden", 403);
    }

    const { vendorId } = await params;
    const vendor = await getVendor(vendorId);
    if (!vendor) {
      return apiError("Not found", 404);
    }

    const [profile, responsibilityCompliance] = await Promise.all([
      getVendorProfile(vendorId),
      getCustomerResponsibilityCompliance(vendorId),
    ]);

    return Response.json(
      buildVendorDetailResponse(vendor, profile, responsibilityCompliance),
    );
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_EDIT))
      return apiError("Forbidden", 403);

    const { vendorId } = await params;
    const existing = await getVendor(vendorId);
    if (!existing) return apiError("Not found", 404);

    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }
    if (!data || typeof data !== "object" || Array.isArray(data))
      return apiError("Invalid vendor structure.", 400);

    const record = data as Record<string, unknown>;
    const parsed = vendorSchema.safeParse({
      name: record.name ?? existing.name,
      externalId: record.externalId ?? existing.externalId ?? undefined,
      contactName: record.contactName ?? existing.contactName ?? "",
      contactEmail: record.contactEmail ?? existing.contactEmail,
      tier: record.tier ?? existing.tier ?? "",
      website: record.website ?? existing.website ?? "",
      notes: record.notes ?? existing.notes ?? "",
      serviceDescription:
        record.serviceDescription ?? existing.serviceDescription ?? "",
      dataSensitivity: record.dataSensitivity ?? existing.dataSensitivity ?? "",
      contractRenewalDate:
        record.contractRenewalDate ?? existing.contractRenewalDate ?? "",
      contractValue: record.contractValue ?? existing.contractValue ?? "",
      geographicRisk: record.geographicRisk ?? existing.geographicRisk ?? "",
      tags: record.tags ?? existing.tags ?? [],
      ownerId: record.ownerId ?? existing.ownerId ?? "",
    });

    if (!parsed.success) return apiError("Invalid vendor data.", 400);

    const updated = await updateVendor(vendorId, parsed.data);
    return Response.json(updated);
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(_request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_DELETE))
      return apiError("Forbidden", 403);

    const { vendorId } = await params;
    const existing = await getVendor(vendorId);
    if (!existing) return apiError("Not found", 404);

    await deleteVendor(vendorId);
    return Response.json({ deleted: true });
  });
}
