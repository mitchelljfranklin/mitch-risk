import { render } from "@react-email/components";
import { type Prisma } from "@prisma/client";
import nodemailer from "nodemailer";

import { DynamicEmail } from "@/emails/dynamic";
import {
  getEmailSecret,
  getEmailSettings,
  getEmailTemplateSettings,
} from "@/lib/settings";
import { prisma } from "@/lib/prisma";

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const settings = await getEmailSettings();
  if (!settings.smtpHost) {
    return null;
  }

  const password = await getEmailSecret();

  const user = settings.smtpUser || undefined;
  const pass = password || undefined;
  const auth = user || pass ? { user, pass } : undefined;

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth,
  });
}

function replaceTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => tokens[key] ?? `{{${key}}}`,
  );
}

type TemplateType =
  | "invite"
  | "invite-password"
  | "reminder"
  | "escalation"
  | "submission"
  | "clarification"
  | "reset";

export type SendEmailResult = {
  ok: boolean;
  subject: string;
  notificationLogId: string;
};

export type SendEmailOptions = {
  assessmentId?: string;
  sentById?: string;
  updateLogId?: string;
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "unknown error";
}

async function createNotificationLog(
  data: Prisma.NotificationLogCreateInput,
): Promise<string> {
  try {
    const created = await prisma.notificationLog.create({ data });
    return created.id;
  } catch (logError) {
    console.error("Failed to create notification log:", logError);
    return "";
  }
}

async function updateNotificationLogStatus(
  notificationLogId: string,
  status: string,
  errorMessageValue: string | null,
): Promise<void> {
  if (!notificationLogId) return;
  await prisma.notificationLog
    .update({
      where: { id: notificationLogId },
      data: { status, errorMessage: errorMessageValue },
    })
    .catch(() => undefined);
}

export async function sendEmail(
  to: string,
  templateType: TemplateType,
  tokens: Record<string, string>,
  options?: SendEmailOptions,
): Promise<SendEmailResult> {
  const [emailSettings, templates] = await Promise.all([
    getEmailSettings(),
    getEmailTemplateSettings(),
  ]);

  const subjectByType: Record<TemplateType, string> = {
    invite: templates.inviteSubject,
    "invite-password": templates.invitePasswordSubject,
    reminder: templates.reminderSubject,
    escalation: templates.escalationSubject,
    submission: templates.submissionSubject,
    clarification: templates.clarificationSubject,
    reset: templates.resetSubject,
  };
  const bodyByType: Record<TemplateType, string> = {
    invite: templates.inviteBody,
    "invite-password": templates.invitePasswordBody,
    reminder: templates.reminderBody,
    escalation: templates.escalationBody,
    submission: templates.submissionBody,
    clarification: templates.clarificationBody,
    reset: templates.resetBody,
  };

  const subject = subjectByType[templateType];
  const body = bodyByType[templateType];

  const resolvedSubject = replaceTokens(subject, tokens);
  const resolvedBody = replaceTokens(body, tokens);

  const notificationLogId = options?.updateLogId
    ? options.updateLogId
    : await createNotificationLog({
        assessment: options?.assessmentId
          ? { connect: { id: options.assessmentId } }
          : undefined,
        type: templateType.toUpperCase(),
        sentTo: to,
        subject: resolvedSubject,
        status: "FAILED",
        sentBy: options?.sentById
          ? { connect: { id: options.sentById } }
          : undefined,
      });

  const transport = await getTransporter();
  if (!transport) {
    await updateNotificationLogStatus(
      notificationLogId,
      "FAILED",
      "SMTP is not configured.",
    );
    return { ok: false, subject: resolvedSubject, notificationLogId };
  }

  const emailFrom =
    emailSettings.fromAddress ||
    emailSettings.smtpUser ||
    "noreply@mitch-risk.local";

  try {
    const html = await render(
      DynamicEmail({
        heading: resolvedSubject,
        body: resolvedBody,
      }),
    );
    await transport.sendMail({
      from: `${emailSettings.fromName} <${emailFrom}>`,
      to,
      subject: resolvedSubject,
      html,
    });

    await updateNotificationLogStatus(notificationLogId, "SENT", null);
    return { ok: true, subject: resolvedSubject, notificationLogId };
  } catch (sendError) {
    const errMsg = errorMessage(sendError);
    console.error("Failed to send email:", sendError);
    await updateNotificationLogStatus(notificationLogId, "FAILED", errMsg);
    return { ok: false, subject: resolvedSubject, notificationLogId };
  }
}

export async function sendTestEmail(
  to: string,
  sentById?: string,
  updateLogId?: string,
): Promise<{ ok: boolean; message: string }> {
  const settings = await getEmailSettings();
  if (!settings.smtpHost) {
    return { ok: false, message: "SMTP is not configured." };
  }

  const transport = await getTransporter();
  if (!transport) {
    return { ok: false, message: "Failed to create transporter." };
  }

  const subject = "mitch-risk — SMTP test";

  const notificationLogId = updateLogId
    ? updateLogId
    : await createNotificationLog({
        type: "TEST",
        sentTo: to,
        subject,
        status: "FAILED",
        sentBy: sentById ? { connect: { id: sentById } } : undefined,
      });

  try {
    await transport.sendMail({
      from: `${settings.fromName} <${settings.fromAddress || settings.smtpUser}>`,
      to,
      subject,
      text: "Your SMTP settings are working correctly.",
    });

    await updateNotificationLogStatus(notificationLogId, "SENT", null);
    return { ok: true, message: "Test email sent." };
  } catch (sendError) {
    const errMsg = `Failed: ${errorMessage(sendError)}`;
    await updateNotificationLogStatus(notificationLogId, "FAILED", errMsg);
    return { ok: false, message: errMsg };
  }
}
