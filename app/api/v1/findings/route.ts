import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { listFindings } from "@/lib/db/findings";

export async function GET(request: Request) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.ASSESSMENTS_VIEW))
      return apiError("Forbidden", 403);

    const { searchParams } = new URL(request.url);

    const { findings, totalCount, page, pageSize } = await listFindings({
      status: searchParams.get("status") ?? undefined,
      severity: searchParams.get("severity") ?? undefined,
      vendorId: searchParams.get("vendorId") ?? undefined,
      page: searchParams.get("page")
        ? Number(searchParams.get("page"))
        : undefined,
    });

    return Response.json({ entries: findings, page, pageSize, totalCount });
  });
}
