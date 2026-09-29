import { type FindingStatus } from "../../../../../prisma/generated/prisma/client";
import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
import { findingStatusUpdateSchema } from "@/lib/schemas/findings";
import { getFinding, updateFindingStatus } from "@/lib/db/findings";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ findingId: string }> },
) {
  return runApiHandler(async () => {
    const auth = await authenticateRequest(request);
    if (!auth) return apiError("Unauthorized", 401);
    if (!authResultHasPermission(auth, PERMISSIONS.ASSESSMENTS_REVIEW))
      return apiError("Forbidden", 403);

    const { findingId } = await params;
    const finding = await getFinding(findingId);
    if (!finding) return apiError("Not found", 404);

    if (finding.status !== "OPEN")
      return apiError("Invalid status transition.", 400);

    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const parsed = findingStatusUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const statusInvalid = parsed.error.issues.some(
        (issue) => issue.path[0] === "status",
      );
      return apiError(
        statusInvalid
          ? "Invalid status. Must be REMEDIATED or RISK_ACCEPTED."
          : "Invalid request body.",
        400,
      );
    }

    const { status, resolutionNote } = parsed.data;
    const resolvedById = auth.userId ?? null;

    const updated = await updateFindingStatus({
      findingId,
      status: status as FindingStatus,
      resolutionNote,
      resolvedById,
    });

    return Response.json({
      id: updated.id,
      title: updated.title,
      status: updated.status,
      severity: updated.severity,
      resolutionNote: updated.resolutionNote,
      resolvedAt: updated.resolvedAt,
    });
  });
}
