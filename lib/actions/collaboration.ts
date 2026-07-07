"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser, requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  addComment,
  finalizeAssessment,
  markUnderReview,
  reopenReview,
  sendBackToVendor,
  setReviewDecision,
} from "@/lib/db/collaboration";
import { getAssessmentRecipients } from "@/lib/db/assessments";
import { logAudit } from "@/lib/db/audit";
import { sendEmail } from "@/lib/email/mailer";
import { env } from "@/lib/env";
import { getField } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const VALID_DECISIONS = ["APPROVED", "CLARIFICATION_REQUESTED"];

export async function addCommentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_REVIEW);
  const assessmentId = getField(formData, "assessmentId");
  const assessmentQuestionId =
    getField(formData, "assessmentQuestionId") || undefined;
  const parentId = getField(formData, "parentId") || undefined;
  const body = getField(formData, "body").trim();
  const visibility = getField(formData, "visibility") || "INTERNAL";
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
    visibility,
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

  const responseRecord = await prisma.response.findUnique({
    where: { id: responseId },
    select: { assessmentId: true },
  });
  if (!responseRecord || responseRecord.assessmentId !== assessmentId) {
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
      visibility: "VENDOR",
    });
  }

  await setReviewDecision({
    responseId,
    reviewerId: user.id,
    decision,
    note,
  });

  // First review decision moves a submitted assessment into review.
  await markUnderReview(assessmentId);

  await logAudit(user.id, "REVIEW_DECISION", "Response", responseId, {
    decision,
    note,
  });

  revalidatePath(`/assessments/${assessmentId}`);
}

export async function sendBackToVendorAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_REVIEW);
  const assessmentId = getField(formData, "assessmentId");
  const message = getField(formData, "message").trim();

  await sendBackToVendor(assessmentId);

  const details = await getAssessmentRecipients(assessmentId);
  if (details) {
    const recipients =
      details.portalRecipients.length > 0
        ? details.portalRecipients
        : [details.vendor.contactEmail];
    const user = await getCurrentUser();
    const portalUrl = details.accessToken
      ? `${env.APP_URL}/portal/${details.accessToken}`
      : env.APP_URL;

    for (const recipient of recipients) {
      if (!recipient) continue;
      await sendEmail(
        recipient,
        "clarification",
        {
          vendorName: details.vendor.name,
          assessmentTitle: details.title,
          portalUrl,
          dueDate: details.dueDate
            ? details.dueDate.toISOString().slice(0, 10)
            : "",
          message: message || "Please review and resubmit your questionnaire.",
        },
        { assessmentId, sentById: user?.id },
      );
    }
  }

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "SEND_BACK_TO_VENDOR", "Assessment", assessmentId);
  }
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function reopenReviewAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_REVIEW);
  const assessmentId = getField(formData, "assessmentId");
  await reopenReview(assessmentId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "REOPEN_REVIEW", "Assessment", assessmentId);
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
