"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser, getCurrentUser } from "@/lib/auth";
import { sendEmail, sendTestEmail } from "@/lib/email/mailer";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/actions/helpers";
import {
  createAssessment,
  deleteAssessment,
  extendAssessmentToken,
  getAssessmentForEmail,
  regenerateAssessmentToken,
  revokeAssessmentToken,
  sendAssessment,
  updateAssessment,
} from "@/lib/db/assessments";
import { assessmentSchema } from "@/lib/schemas/assessment";

export type AssessmentFormState = { error: string } | undefined;

export async function createAssessmentAction(
  previousState: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  await requireUser();
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
  await requireUser();
  const assessmentId = getField(formData, "assessmentId");
  await sendAssessment(assessmentId);
  revalidatePath(`/assessments/${assessmentId}`);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "SEND_ASSESSMENT", "Assessment", assessmentId);
  }

  const sent = await getAssessmentForEmail(assessmentId);
  if (sent && sent.accessToken) {
    const portalUrl = `${env.APP_URL}/portal/${sent.accessToken}`;
    await sendEmail(
      sent.vendorContactEmail,
      "invite",
      {
        vendorName: sent.vendorName,
        assessmentTitle: sent.title,
        portalUrl,
        dueDate: sent.dueDate ? sent.dueDate.toISOString().slice(0, 10) : "",
      },
      { assessmentId, sentById: user?.id },
    );
  }
}

export async function generateLinkAction(formData: FormData) {
  await requireUser();
  const assessmentId = getField(formData, "assessmentId");
  await sendAssessment(assessmentId);
  revalidatePath(`/assessments/${assessmentId}`);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "SEND_ASSESSMENT", "Assessment", assessmentId);
  }
}

export async function sendToCustomEmailAction(formData: FormData) {
  await requireUser();
  const assessmentId = getField(formData, "assessmentId");
  const customEmail = getField(formData, "customEmail").trim();

  if (!customEmail) return;

  await sendAssessment(assessmentId);
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
    for (const email of emails) {
      await sendEmail(
        email,
        "invite",
        {
          vendorName: sent.vendorName,
          assessmentTitle: sent.title,
          portalUrl,
          dueDate: sent.dueDate ? sent.dueDate.toISOString().slice(0, 10) : "",
        },
        { assessmentId, sentById: user?.id },
      );
    }
  }
}

export async function sendTestEmailAction(
  previousState: { ok: boolean; message: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  await requireUser();
  const user = await getCurrentUser();
  return sendTestEmail(getField(formData, "email"), user?.id);
}

export type UpdateAssessmentState =
  { ok: boolean; message: string } | undefined;

export async function updateAssessmentAction(
  previousState: UpdateAssessmentState,
  formData: FormData,
): Promise<UpdateAssessmentState> {
  await requireUser();
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
  await requireUser();
  const assessmentId = getField(formData, "assessmentId");
  await revokeAssessmentToken(assessmentId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "REVOKE_ASSESSMENT", "Assessment", assessmentId);
  }
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function extendAssessmentAction(formData: FormData) {
  await requireUser();
  const assessmentId = getField(formData, "assessmentId");
  await extendAssessmentToken(assessmentId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "EXTEND_ASSESSMENT", "Assessment", assessmentId);
  }
  revalidatePath(`/assessments/${assessmentId}`);
}

export async function regenerateAssessmentAction(formData: FormData) {
  await requireUser();
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
  await requireUser();
  const assessmentId = getField(formData, "assessmentId");
  await deleteAssessment(assessmentId);
  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "DELETE_ASSESSMENT", "Assessment", assessmentId);
  }
  redirect("/assessments");
}
