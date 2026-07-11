"use server";

import { type FindingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { updateFindingStatus, getFinding } from "@/lib/db/findings";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { FINDING_STATUSES } from "@/lib/schemas/assessment";
import { prisma } from "@/lib/prisma";
import { dispatchWebhook } from "@/lib/webhooks";

export async function updateFindingStatusAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ASSESSMENTS_REVIEW);

  const findingId = getField(formData, "findingId");
  const assessmentId = getField(formData, "assessmentId");
  const status = getField(formData, "status");
  const resolutionNote = getField(formData, "resolutionNote") || undefined;

  if (!findingId || !FINDING_STATUSES.includes(status as never)) {
    return;
  }

  await updateFindingStatus({
    findingId,
    status: status as FindingStatus,
    resolutionNote,
    resolvedById: user.id,
  });

  await logAudit(user.id, "UPDATE_FINDING", "Finding", findingId, { status });

  if (status !== "OPEN") {
    const finding = await getFinding(findingId);
    if (finding) {
      dispatchWebhook("FINDING_RESOLVED", {
        findingId,
        severity: finding.severity,
        status,
        resolutionNote,
        assessmentId: finding.assessmentId,
      });
    }
  }

  if (assessmentId) {
    revalidatePath(`/assessments/${assessmentId}`);
  }
  revalidatePath("/risk-register");
}

export type BulkFindingsResult = { ok: boolean; message: string } | undefined;

export async function bulkUpdateFindingStatusesAction(
  _previousState: BulkFindingsResult,
  formData: FormData,
): Promise<BulkFindingsResult> {
  const user = await requirePermission(PERMISSIONS.ASSESSMENTS_REVIEW);

  const rawIds = getField(formData, "findingIds");
  const status = getField(formData, "status");
  const resolutionNote = getField(formData, "resolutionNote") || undefined;

  if (!FINDING_STATUSES.includes(status as never)) {
    return { ok: false, message: "Invalid status." };
  }

  let findingIds: string[] = [];
  try {
    findingIds = JSON.parse(rawIds);
  } catch {
    return { ok: false, message: "Invalid selection data." };
  }

  if (!Array.isArray(findingIds) || findingIds.length === 0) {
    return { ok: false, message: "No findings selected." };
  }

  await prisma.$transaction(
    findingIds.map((id) =>
      updateFindingStatus({
        findingId: id,
        status: status as FindingStatus,
        resolutionNote,
        resolvedById: user.id,
      }),
    ),
  );

  for (const id of findingIds) {
    await logAudit(user.id, "UPDATE_FINDING", "Finding", id, { status });
  }

  if (status !== "OPEN") {
    const resolvedFindings = await prisma.finding.findMany({
      where: { id: { in: findingIds } },
      select: { id: true, severity: true, assessmentId: true },
    });
    for (const finding of resolvedFindings) {
      dispatchWebhook("FINDING_RESOLVED", {
        findingId: finding.id,
        severity: finding.severity,
        status,
        resolutionNote,
        assessmentId: finding.assessmentId,
      });
    }
  }

  revalidatePath("/risk-register");
  return {
    ok: true,
    message: `${findingIds.length} finding${findingIds.length !== 1 ? "s" : ""} updated.`,
  };
}
