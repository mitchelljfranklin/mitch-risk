"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  addComment,
  finalizeAssessment,
  reopenAssessment,
  setReviewDecision,
} from "@/lib/db/collaboration";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/actions/helpers";
import { prisma } from "@/lib/prisma";

const VALID_DECISIONS = ["APPROVED", "REJECTED", "CLARIFICATION_REQUESTED"];

export async function addCommentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_REVIEW);
  const assessmentId = getField(formData, "assessmentId");
  const assessmentQuestionId =
    getField(formData, "assessmentQuestionId") || undefined;
  const parentId = getField(formData, "parentId") || undefined;
  const body = getField(formData, "body").trim();
  if (!body) {
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  await addComment({
    assessmentId,
    assessmentQuestionId,
    parentId,
    authorType: "INTERNAL",
    authorName: user.name ?? user.email ?? "Reviewer",
    body,
  });
  await logAudit(user.id, "ADD_COMMENT", "Assessment", assessmentId);
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function reviewAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_REVIEW);
  const assessmentId = getField(formData, "assessmentId");
  const responseId = getField(formData, "responseId");
  const decision = getField(formData, "decision");
  const note = getField(formData, "note") || undefined;

  if (!VALID_DECISIONS.includes(decision)) {
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  const existing = await prisma.answerReview.findUnique({
    where: { responseId },
    select: { note: true, decision: true },
  });

  if (existing?.note) {
    const parentResponse = await prisma.response.findUnique({
      where: { id: responseId },
      select: { assessmentQuestionId: true },
    });

    await addComment({
      assessmentId,
      assessmentQuestionId: parentResponse?.assessmentQuestionId ?? undefined,
      authorType: "INTERNAL",
      authorName: user.name ?? user.email ?? "Reviewer",
      body: `Previous review (${existing.decision === "CLARIFICATION_REQUESTED" ? "clarification requested" : existing.decision.toLowerCase()}): ${existing.note}`,
    });
  }

  await setReviewDecision({
    responseId,
    reviewerId: user.id,
    decision,
    note,
  });

  await logAudit(user.id, "REVIEW_DECISION", "Response", responseId, {
    decision,
    note,
  });

  revalidatePath(`/assessments/${assessmentId}`);
}

export async function reopenAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_REVIEW);
  const assessmentId = getField(formData, "assessmentId");
  await reopenAssessment(assessmentId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "REOPEN_ASSESSMENT", "Assessment", assessmentId);
  }
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function finalizeAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_REVIEW);
  const assessmentId = getField(formData, "assessmentId");
  const result = await finalizeAssessment(assessmentId);
  if (!result.ok) {
    throw new Error(`${result.missing} response(s) still need to be reviewed.`);
  }
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "FINALIZE_ASSESSMENT", "Assessment", assessmentId);
  }
  revalidatePath(`/assessments/${assessmentId}`);
}

export type FinalizeState = { ok: boolean; message: string } | undefined;

export async function finalizeWithStateAction(
  previousState: FinalizeState,
  formData: FormData,
): Promise<FinalizeState> {
  await requirePermission(PERMISSIONS.ASSESSMENTS_REVIEW);
  const assessmentId = getField(formData, "assessmentId");
  const result = await finalizeAssessment(assessmentId);
  if (!result.ok) {
    return {
      ok: false,
      message: `${result.missing} response(s) still need to be reviewed.`,
    };
  }
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "FINALIZE_ASSESSMENT", "Assessment", assessmentId);
  }
  revalidatePath(`/assessments/${assessmentId}`);
  return { ok: true, message: "" };
}
