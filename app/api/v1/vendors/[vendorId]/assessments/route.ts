import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { getVendor } from "@/lib/db/vendors";
import { listAssessments } from "@/lib/db/assessments";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.VENDORS_VIEW))
      return apiError("Forbidden", 403);

    const { vendorId } = await params;
    const vendor = await getVendor(vendorId);
    if (!vendor) return apiError("Not found", 404);

    const { searchParams } = new URL(request.url);

    const { assessments, totalCount, page, pageSize } = await listAssessments({
      vendorId,
      status: searchParams.get("status") ?? undefined,
      page: parseInt(searchParams.get("page") ?? "1", 10) || 1,
    });

    return Response.json({
      vendorId,
      vendorName: vendor.name,
      entries: assessments.map((assessment) => ({
        id: assessment.id,
        title: assessment.title,
        status: assessment.status,
        score: assessment.score,
        dueDate: assessment.dueDate,
        sentAt: assessment.sentAt,
        submittedAt: assessment.submittedAt,
        templateName: assessment.template?.name ?? null,
        templateVersion: assessment.template?.version ?? null,
        reviewerName: assessment.reviewer?.name ?? null,
      })),
      page,
      pageSize,
      totalCount,
    });
  });
}
