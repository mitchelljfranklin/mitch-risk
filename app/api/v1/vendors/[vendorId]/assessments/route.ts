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
      page: searchParams.get("page")
        ? Number(searchParams.get("page"))
        : undefined,
    });

    return Response.json({
      vendorId,
      vendorName: vendor.name,
      entries: assessments.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        score: a.score,
        dueDate: a.dueDate,
        sentAt: a.sentAt,
        submittedAt: a.submittedAt,
        templateName: a.template?.name ?? null,
        templateVersion: a.template?.version ?? null,
        reviewerName: a.reviewer?.name ?? null,
      })),
      page,
      pageSize,
      totalCount,
    });
  });
}
