import { type FindingStatus } from "../../../../../prisma/generated/prisma/client";
import { authenticateRequest, authResultHasPermission } from "@/lib/api-auth";
import { apiError, runApiHandler } from "@/lib/api-response";
import { PERMISSIONS } from "@/lib/permissions";
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
    if (!data || typeof data !== "object" || Array.isArray(data))
      return apiError("Invalid request body.", 400);

    const record = data as Record<string, unknown>;
    const status = record.status;
    const resolutionNote =
      typeof record.resolutionNote === "string"
        ? record.resolutionNote
        : undefined;

    if (status !== "REMEDIATED" && status !== "RISK_ACCEPTED")
      return apiError(
        "Invalid status. Must be REMEDIATED or RISK_ACCEPTED.",
        400,
      );

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
