"use server";

import { type FindingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { updateFindingStatus } from "@/lib/db/findings";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/actions/helpers";
import { FINDING_STATUSES } from "@/lib/schemas/assessment";

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

  if (assessmentId) {
    revalidatePath(`/assessments/${assessmentId}`);
  }
  revalidatePath("/risk-register");
}
