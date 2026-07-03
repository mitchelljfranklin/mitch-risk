import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { listVendors } from "@/lib/db/vendors";

export async function GET(request: Request) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return apiError("Unauthorized", 401);
    }
    if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_VIEW)) {
      return apiError("Forbidden", 403);
    }

    const { searchParams } = new URL(request.url);
    const { vendors } = await listVendors({
      query: searchParams.get("query") ?? undefined,
      tier: searchParams.get("tier") ?? undefined,
      pageSize: 1000,
    });

    return Response.json(
      vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        contactName: vendor.contactName,
        contactEmail: vendor.contactEmail,
        tier: vendor.tier,
        website: vendor.website,
        overallScore: vendor.overallScore,
        lastAssessedAt: vendor.lastAssessedAt,
        assessmentCount: vendor._count.assessments,
      })),
    );
  });
}
