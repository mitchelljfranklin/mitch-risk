"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { sendEmail, sendTestEmail } from "@/lib/email/mailer";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  createAssessment,
  deleteAssessment,
  extendAssessmentToken,
  getAssessmentForEmail,
  regenerateAssessmentToken,
  revokeAssessmentToken,
  sendAssessment,
  setAssessmentRecipients,
  updateAssessment,
} from "@/lib/db/assessments";
import { assessmentSchema } from "@/lib/schemas/assessment";

export type AssessmentFormState = { error: string } | undefined;

export async function createAssessmentAction(
  previousState: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);
  const vendorId = getField(formData, "vendorId");
  const parsed = assessmentSchema.safeParse({
    title: getField(formData, "title"),
    templateId: getField(formData, "templateId"),
    dueDate: getField(formData, "dueDate"),
    reviewerId: getField(formData, "reviewerId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const assessment = await createAssessment(vendorId, parsed.data);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "CREATE_ASSESSMENT", "Assessment", assessment.id);
  }
  redirect(`/assessments/${assessment.id}`);
}

export async function sendAssessmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);
  const assessmentId = getField(formData, "assessmentId");
  const portalPassword = getField(formData, "portalPassword") || undefined;
  await sendAssessment(assessmentId, portalPassword);
  revalidatePath(`/assessments/${assessmentId}`);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "SEND_ASSESSMENT", "Assessment", assessmentId);
  }

  const sent = await getAssessmentForEmail(assessmentId);
  if (sent && sent.accessToken) {
    const portalUrl = `${env.APP_URL}/portal/${sent.accessToken}`;
    const templateType = portalPassword ? "invite-password" : "invite";
    await sendEmail(
      sent.vendorContactEmail,
      templateType,
      {
        vendorName: sent.vendorName,
        assessmentTitle: sent.title,
        portalUrl,
        dueDate: sent.dueDate ? sent.dueDate.toISOString().slice(0, 10) : "",
        portalPassword: portalPassword ?? "",
      },
      { assessmentId, sentById: user?.id },
    );
    await setAssessmentRecipients(assessmentId, [sent.vendorContactEmail]);
  }
}

export async function generateLinkAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);
  const assessmentId = getField(formData, "assessmentId");
  const portalPassword = getField(formData, "portalPassword") || undefined;
  await sendAssessment(assessmentId, portalPassword);
  revalidatePath(`/assessments/${assessmentId}`);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "SEND_ASSESSMENT", "Assessment", assessmentId);
  }
}

export async function sendToCustomEmailAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);
  const assessmentId = getField(formData, "assessmentId");
  const customEmail = getField(formData, "customEmail").trim();

  if (!customEmail) return;

  const portalPassword = getField(formData, "portalPassword") || undefined;
  await sendAssessment(assessmentId, portalPassword);
  revalidatePath(`/assessments/${assessmentId}`);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "SEND_ASSESSMENT", "Assessment", assessmentId);
  }

  const sent = await getAssessmentForEmail(assessmentId);
  if (sent && sent.accessToken) {
    const portalUrl = `${env.APP_URL}/portal/${sent.accessToken}`;
    const emails = customEmail
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    const templateType = portalPassword ? "invite-password" : "invite";
    for (const email of emails) {
      await sendEmail(
        email,
        templateType,
        {
          vendorName: sent.vendorName,
          assessmentTitle: sent.title,
          portalUrl,
          dueDate: sent.dueDate ? sent.dueDate.toISOString().slice(0, 10) : "",
          portalPassword: portalPassword ?? "",
        },
        { assessmentId, sentById: user?.id },
      );
    }
    if (emails.length > 0) {
      await setAssessmentRecipients(assessmentId, emails);
    }
  }
}

export async function sendTestEmailAction(
  previousState: { ok: boolean; message: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);
  const user = await getCurrentUser();
  return sendTestEmail(getField(formData, "email"), user?.id);
}

export type UpdateAssessmentState =
  { ok: boolean; message: string } | undefined;

export async function updateAssessmentAction(
  previousState: UpdateAssessmentState,
  formData: FormData,
): Promise<UpdateAssessmentState> {
  await requirePermission(PERMISSIONS.ASSESSMENTS_EDIT);
  const assessmentId = getField(formData, "assessmentId");
  const title = getField(formData, "title").trim();
  const dueDate = getField(formData, "dueDate");

  if (!title) return { ok: false, message: "Title is required." };

  await updateAssessment(assessmentId, { title, dueDate });
  revalidatePath(`/assessments/${assessmentId}`);
  revalidatePath("/assessments");
  return { ok: true, message: "Saved." };
}

export async function revokeAssessmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_EDIT);
  const assessmentId = getField(formData, "assessmentId");
  await revokeAssessmentToken(assessmentId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "REVOKE_ASSESSMENT", "Assessment", assessmentId);
  }
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function extendAssessmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_EDIT);
  const assessmentId = getField(formData, "assessmentId");
  await extendAssessmentToken(assessmentId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "EXTEND_ASSESSMENT", "Assessment", assessmentId);
  }
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function regenerateAssessmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_EDIT);
  const assessmentId = getField(formData, "assessmentId");
  await regenerateAssessmentToken(assessmentId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      "REGENERATE_ASSESSMENT",
      "Assessment",
      assessmentId,
    );
  }
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function deleteAssessmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.ASSESSMENTS_DELETE);
  const assessmentId = getField(formData, "assessmentId");
  // Record the audit entry before the delete so a crash mid-operation can't
  // erase the assessment without leaving a trace of who removed it.
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "DELETE_ASSESSMENT", "Assessment", assessmentId);
  }
  await deleteAssessment(assessmentId);
  redirect("/assessments");
}

export type BulkSendState =
  | {
      ok: boolean;
      message: string;
      sent?: number;
      skipped?: number;
      emailFailed?: number;
    }
  | undefined;

type BulkVendorResult =
  { status: "sent"; emailFailed: boolean } | { status: "skipped" };

async function processBulkVendorSend(params: {
  vendorId: string;
  templateId: string;
  dueDate: string;
  reviewerId: string;
  portalPassword: string | undefined;
  user: { id: string } | null;
}): Promise<BulkVendorResult> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: params.vendorId },
    select: { name: true, contactEmail: true },
  });
  if (!vendor) {
    console.error(`[bulk-send] vendor not found: ${params.vendorId}`);
    return { status: "skipped" };
  }

  const vendorTitle = params.vendorId.slice(0, 8);
  const assessment = await createAssessment(params.vendorId, {
    title: `Bulk assessment — ${vendorTitle}`,
    templateId: params.templateId,
    dueDate: params.dueDate,
    reviewerId: params.reviewerId || "",
  });

  await sendAssessment(assessment.id, params.portalPassword);

  if (params.user) {
    await logAudit(
      params.user.id,
      "SEND_ASSESSMENT",
      "Assessment",
      assessment.id,
    );
  }

  let emailFailed = false;
  if (vendor.contactEmail) {
    try {
      const sent = await getAssessmentForEmail(assessment.id);
      if (sent?.accessToken) {
        const portalUrl = `${env.APP_URL}/portal/${sent.accessToken}`;
        await sendEmail(
          vendor.contactEmail,
          params.portalPassword ? "invite-password" : "invite",
          {
            vendorName: vendor.name,
            assessmentTitle: sent.title,
            portalUrl,
            dueDate: params.dueDate,
            portalPassword: params.portalPassword ?? "",
          },
          { assessmentId: assessment.id, sentById: params.user?.id },
        );
        await setAssessmentRecipients(assessment.id, [vendor.contactEmail]);
      }
    } catch (emailError) {
      emailFailed = true;
      console.error(
        `[bulk-send] email failed for vendor ${params.vendorId} (assessment ${assessment.id}):`,
        emailError,
      );
    }
  }

  return { status: "sent", emailFailed };
}

function buildBulkSendMessage(
  sentCount: number,
  skippedCount: number,
  emailFailedCount: number,
): string {
  const parts = [`Sent ${sentCount} assessment${sentCount !== 1 ? "s" : ""}`];
  if (skippedCount > 0) {
    parts.push(`${skippedCount} could not be sent`);
  }
  if (emailFailedCount > 0) {
    parts.push(
      `${emailFailedCount} email${emailFailedCount !== 1 ? "s" : ""} failed to deliver`,
    );
  }
  return `${parts.join(". ")}.`;
}

export async function sendBulkAssessmentsAction(
  previousState: BulkSendState,
  formData: FormData,
): Promise<BulkSendState> {
  await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);

  const templateId = getField(formData, "templateId");
  const dueDate = getField(formData, "dueDate");
  const reviewerId = getField(formData, "reviewerId") || "";
  const portalPassword = getField(formData, "portalPassword") || undefined;
  const vendorIds = formData.getAll("vendorIds").map(String);

  if (!templateId) {
    return { ok: false, message: "No template selected." };
  }
  if (vendorIds.length === 0) {
    return { ok: false, message: "No vendors selected." };
  }

  const user = await getCurrentUser();
  let sentCount = 0;
  let skippedCount = 0;
  let emailFailedCount = 0;

  for (const vendorId of vendorIds) {
    try {
      const result = await processBulkVendorSend({
        vendorId,
        templateId,
        dueDate,
        reviewerId,
        portalPassword,
        user,
      });

      if (result.status === "sent") {
        sentCount++;
        if (result.emailFailed) {
          emailFailedCount++;
        }
      } else {
        skippedCount++;
      }
    } catch (error) {
      skippedCount++;
      console.error(
        `[bulk-send] failed to send for vendor ${vendorId}:`,
        error,
      );
    }
  }

  revalidatePath("/assessments");
  revalidatePath("/vendors");

  return {
    ok: true,
    message: buildBulkSendMessage(sentCount, skippedCount, emailFailedCount),
    sent: sentCount,
    skipped: skippedCount,
    emailFailed: emailFailedCount,
  };
}
