import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendorByExternalId } from "@/lib/db/vendors";
import { getVendorProfile } from "@/lib/db/compliance";
import { getCustomerResponsibilityCompliance } from "@/lib/db/customer-responsibility";
import { buildVendorDetailResponse } from "@/lib/api/vendor-detail";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ externalId: string }> },
) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return apiError("Unauthorized", 401);
    }
    if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_VIEW)) {
      return apiError("Forbidden", 403);
    }

    const { externalId } = await params;
    const vendor = await getVendorByExternalId(externalId);
    if (!vendor) {
      return apiError("Not found", 404);
    }

    const [profile, responsibilityCompliance] = await Promise.all([
      getVendorProfile(vendor.id),
      getCustomerResponsibilityCompliance(vendor.id),
    ]);

    return Response.json(
      buildVendorDetailResponse(vendor, profile, responsibilityCompliance),
    );
  });
}
