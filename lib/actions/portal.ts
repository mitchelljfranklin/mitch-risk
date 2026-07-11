"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";

import {
  createEvidence,
  deleteEvidenceForQuestion,
  getAssessmentForToken,
  getAssessmentQuestion,
  getEvidence,
  isPortalEditable,
  saveResponses,
  submitAssessment,
} from "@/lib/db/assessments";
import { addComment } from "@/lib/db/collaboration";
import { getClientIp } from "@/lib/client-ip";
import { sendEmail } from "@/lib/email/mailer";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { saveProgressSchema } from "@/lib/schemas/portal";
import { getAssessmentSettings, getFileSettings } from "@/lib/settings";
import { storage } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";
import {
  isDangerousUploadMime,
  validateMagicBytes,
} from "@/lib/upload-validation";

async function clientIp(): Promise<string> {
  const requestHeaders = await headers();
  return getClientIp(requestHeaders);
}

export async function saveProgressAction(
  token: string,
  answers: unknown,
): Promise<{ ok: boolean }> {
  if (!rateLimit("autosave", token, 30)) {
    return { ok: false };
  }
  if (!rateLimit("autosave-ip", await clientIp(), 60)) {
    return { ok: false };
  }

  const parsed = saveProgressSchema.safeParse({ answers });
  if (!parsed.success) {
    return { ok: false };
  }
  return saveResponses(token, parsed.data.answers);
}

export type UploadResult =
  | {
      ok: true;
      evidence: { id: string; fileName: string; assessmentQuestionId: string };
    }
  | { ok: false; error: string };

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function uploadEvidenceAction(
  formData: FormData,
): Promise<UploadResult> {
  const { portalUploadsPerMin } = await getAssessmentSettings();
  if (!rateLimit("upload", await clientIp(), portalUploadsPerMin)) {
    return { ok: false, error: "Too many uploads. Please wait a moment." };
  }

  const token = String(formData.get("token") ?? "");
  const assessmentQuestionId = String(
    formData.get("assessmentQuestionId") ?? "",
  );
  const file = formData.get("file");

  const assessment = await getAssessmentForToken(token);
  if (
    !assessment ||
    !isPortalEditable(assessment.status, assessment.tokenExpiresAt)
  ) {
    return { ok: false, error: "This link is no longer valid." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }

  const question = await getAssessmentQuestion(assessmentQuestionId);
  if (!question || question.assessmentId !== assessment.id) {
    return { ok: false, error: "Invalid question." };
  }

  const fileSettings = await getFileSettings();
  const maxBytes = fileSettings.maxUploadMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: `File exceeds the ${fileSettings.maxUploadMb} MB limit.`,
    };
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (
    fileSettings.allowedExtensions.length > 0 &&
    !fileSettings.allowedExtensions.includes(extension)
  ) {
    return { ok: false, error: `Files of type .${extension} are not allowed.` };
  }
  if (isDangerousUploadMime(file.type)) {
    return { ok: false, error: "This file type is not allowed." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!validateMagicBytes(extension, buffer)) {
    return {
      ok: false,
      error: `The file content does not match a .${extension} file.`,
    };
  }

  await deleteEvidenceForQuestion(assessment.id, assessmentQuestionId);
  const storageKey = `${assessment.id}/${randomBytes(8).toString("hex")}-${sanitizeFileName(file.name)}`;
  await storage.save(storageKey, buffer);

  const evidence = await createEvidence({
    assessmentId: assessment.id,
    assessmentQuestionId,
    fileName: file.name,
    storageKey,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });

  await saveResponses(token, [
    { assessmentQuestionId, value: file.name, isNotApplicable: false },
  ]);

  return {
    ok: true,
    evidence: {
      id: evidence.id,
      fileName: evidence.fileName,
      assessmentQuestionId,
    },
  };
}

export async function submitPortalAction(
  token: string,
): Promise<{ ok: boolean; missing: number }> {
  const { portalSubmitPerMin } = await getAssessmentSettings();
  if (!rateLimit("submit", token, portalSubmitPerMin)) {
    return { ok: false, missing: -1 };
  }

  const result = await submitAssessment(token);
  if (!result.ok) return result;

  try {
    const assessment = await prisma.assessment.findUnique({
      where: { accessToken: token },
      select: {
        id: true,
        title: true,
        reviewerId: true,
        vendor: { select: { name: true } },
        reviewer: { select: { email: true, name: true } },
      },
    });

    if (assessment?.reviewer?.email) {
      const appUrl = env.APP_URL;
      await sendEmail(
        assessment.reviewer.email,
        "submission",
        {
          reviewerName: assessment.reviewer.name ?? "Reviewer",
          vendorName: assessment.vendor.name,
          assessmentTitle: assessment.title,
          assessmentUrl: `${appUrl}/assessments/${assessment.id}`,
        },
        { assessmentId: assessment.id },
      );
    }
  } catch (error: unknown) {
    console.error(
      "Failed to send submission notification:",
      error instanceof Error ? error.message : String(error),
    );
    // Notification is best-effort — don't block submission
  }

  return result;
}

export async function vendorAddCommentAction(
  token: string,
  assessmentQuestionId: string,
  body: string,
): Promise<{ ok: boolean }> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false };
  }

  const assessment = await getAssessmentForToken(token);
  if (
    !assessment ||
    !isPortalEditable(assessment.status, assessment.tokenExpiresAt)
  ) {
    return { ok: false };
  }

  await addComment({
    assessmentId: assessment.id,
    assessmentQuestionId,
    authorType: "VENDOR",
    authorName: "Vendor",
    body: trimmed,
    visibility: "VENDOR",
  });

  return { ok: true };
}

export async function removePortalEvidenceAction(
  evidenceId: string,
  token: string,
): Promise<void> {
  const assessment = await getAssessmentForToken(token);
  if (
    !assessment ||
    !isPortalEditable(assessment.status, assessment.tokenExpiresAt)
  )
    return;

  const evidence = await getEvidence(evidenceId);
  if (!evidence || evidence.assessmentId !== assessment.id) return;

  await prisma.evidence.delete({ where: { id: evidenceId } });
  try {
    await storage.delete(evidence.storageKey);
  } catch (error: unknown) {
    console.error(
      "Failed to delete evidence storage:",
      error instanceof Error ? error.message : String(error),
    );
    // Best-effort; orphan-sweep cron cleans any leftovers.
  }
}
