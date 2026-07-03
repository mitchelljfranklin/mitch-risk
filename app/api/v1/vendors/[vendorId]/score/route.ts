import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendorProfile } from "@/lib/db/compliance";
import { getVendor } from "@/lib/db/vendors";

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

    const profile = await getVendorProfile(vendorId);

    return Response.json({
      id: vendor.id,
      name: vendor.name,
      tier: vendor.tier,
      overallScore: vendor.overallScore,
      lastAssessedAt: vendor.lastAssessedAt,
      assessmentCount: profile?.history.length ?? 0,
      latestScore: profile?.history[0]?.score ?? null,
      domainBreakdown: profile?.domainBreakdown ?? [],
    });
  });
}
