import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendor } from "@/lib/db/vendors";
import { getVendorProfile } from "@/lib/db/compliance";

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
      contactName: vendor.contactName,
      contactEmail: vendor.contactEmail,
      tier: vendor.tier,
      website: vendor.website,
      notes: vendor.notes,
      overallScore: vendor.overallScore,
      lastAssessedAt: vendor.lastAssessedAt,
      assessments: vendor.assessments.map((assessment) => ({
        id: assessment.id,
        title: assessment.title,
        status: assessment.status,
        score: assessment.score,
        templateName: assessment.template?.name ?? null,
        templateVersion: assessment.template?.version ?? null,
      })),
      domainBreakdown: profile?.domainBreakdown ?? [],
      history: profile?.history ?? [],
    });
  });
}
