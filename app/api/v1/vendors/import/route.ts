import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { createVendor } from "@/lib/db/vendors";
import { vendorSchema } from "@/lib/schemas/vendor";

export async function POST(request: Request) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return apiError("Unauthorized", 401);
    }
    if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_CREATE)) {
      return apiError("Forbidden", 403);
    }

    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return apiError("Invalid vendor structure.", 400);
    }

    const record = data as Record<string, unknown>;
    const parsed = vendorSchema.safeParse({
      name: record.name ?? "",
      contactName: record.contactName ?? "",
      contactEmail: record.contactEmail ?? "",
      tier: record.tier ?? "",
      website: record.website ?? "",
      notes: record.notes ?? "",
      serviceDescription: record.serviceDescription ?? "",
      dataSensitivity: record.dataSensitivity ?? "",
      contractRenewalDate: record.contractRenewalDate ?? "",
      contractValue: record.contractValue ?? "",
      geographicRisk: record.geographicRisk ?? "",
      tags: record.tags ?? [],
    });

    if (!parsed.success) {
      return apiError("Invalid vendor data.", 400);
    }

    const vendor = await createVendor(parsed.data);
    return Response.json(vendor, { status: 201 });
  });
}
