import { render } from "@react-email/components";
import { type Prisma } from "../../prisma/generated/prisma/client";
import { marked } from "marked";
import nodemailer from "nodemailer";
import { createTranslator } from "next-intl";

import { DynamicEmail } from "@/emails/dynamic";
import { env } from "@/lib/env";
import { loadMessages, type Translate } from "@/lib/i18n/messages";
import {
  getEmailSecret,
  getEmailSettings,
  getEmailTemplateSettings,
  getOrganizationSettings,
  getTrustCenterSettings,
} from "@/lib/settings";
import { localizeEmailTemplates } from "@/lib/settings/email-template-defaults";
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
    (_fullMatch, key) => tokens[key] ?? `{{${key}}}`,
  );
}

type TemplateType =
  | "invite"
  | "invite-password"
  | "reminder"
  | "escalation"
  | "submission"
  | "clarification"
  | "reset"
  | "expiry";

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

async function createNotificationLog(
  data: Prisma.NotificationLogCreateInput,
): Promise<string> {
  try {
    const created = await prisma.notificationLog.create({ data });
    return created.id;
  } catch (logError: unknown) {
    console.error(
      "Failed to create notification log:",
      logError instanceof Error ? logError.message : String(logError),
    );
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
    .catch((updateError: unknown) => {
      console.warn(
        "Failed to update notification log status:",
        updateError instanceof Error
          ? updateError.message
          : String(updateError),
      );
    });
}

export async function sendEmail(
  to: string,
  templateType: TemplateType,
  tokens: Record<string, string>,
  options?: SendEmailOptions,
): Promise<SendEmailResult> {
  const [emailSettings, storedTemplates, organization] = await Promise.all([
    getEmailSettings(),
    getEmailTemplateSettings(),
    getOrganizationSettings(),
  ]);
  const locale = organization.defaultLocale;
  const messages = await loadMessages(locale);
  const translations = createTranslator({
    locale,
    messages,
    namespace: "Email",
  }) as unknown as Translate;
  const templates = localizeEmailTemplates(storedTemplates, locale);

  const subjectByType: Record<TemplateType, string> = {
    invite: templates.inviteSubject,
    "invite-password": templates.invitePasswordSubject,
    reminder: templates.reminderSubject,
    escalation: templates.escalationSubject,
    submission: templates.submissionSubject,
    clarification: templates.clarificationSubject,
    reset: templates.resetSubject,
    expiry: templates.expirySubject,
  };
  const bodyByType: Record<TemplateType, string> = {
    invite: templates.inviteBody,
    "invite-password": templates.invitePasswordBody,
    reminder: templates.reminderBody,
    escalation: templates.escalationBody,
    submission: templates.submissionBody,
    clarification: templates.clarificationBody,
    reset: templates.resetBody,
    expiry: templates.expiryBody,
  };

  const subject = subjectByType[templateType];
  const body = bodyByType[templateType];

  const resolvedSubject = replaceTokens(subject, tokens);
  let resolvedBody = replaceTokens(body, tokens);

  // Trust center footer: injected at send time (stored templates are never
  // mutated) for invite types when the organisation opts in and the public
  // page is enabled. The mailer decides internally so every current and
  // future invite call site gets the footer without remembering to ask.
  if (templateType === "invite" || templateType === "invite-password") {
    const trustSettings = await getTrustCenterSettings();
    if (trustSettings.enabled && trustSettings.includeInInvites) {
      const trustUrl = `${env.APP_URL}/trust`;
      if (!resolvedBody.includes(trustUrl)) {
        resolvedBody += `\n\n---\n\n${translations("trustFooter", { url: trustUrl })}`;
      }
    }
  }

  const htmlBody = await marked.parse(resolvedBody);

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
      translations("smtpNotConfigured"),
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
        htmlBody,
        footer: translations("footer", { appName: organization.name }),
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
  } catch (sendError: unknown) {
    const reason =
      sendError instanceof Error ? sendError.message : "unknown error";
    console.error("Failed to send email:", reason);
    await updateNotificationLogStatus(
      notificationLogId,
      "FAILED",
      translations("sendFailed", { reason }),
    );
    return { ok: false, subject: resolvedSubject, notificationLogId };
  }
}

export async function sendTestEmail(
  to: string,
  sentById?: string,
  updateLogId?: string,
): Promise<{ ok: boolean; message: string }> {
  const settings = await getEmailSettings();
  const organization = await getOrganizationSettings();
  const locale = organization.defaultLocale;
  const messages = await loadMessages(locale);
  const translations = createTranslator({
    locale,
    messages,
    namespace: "Email",
  }) as unknown as Translate;
  if (!settings.smtpHost) {
    return { ok: false, message: translations("smtpNotConfigured") };
  }

  const transport = await getTransporter();
  if (!transport) {
    return { ok: false, message: translations("transporterFailed") };
  }

  const subject = translations("testSubject", { appName: organization.name });

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
      text: translations("testBody"),
    });

    await updateNotificationLogStatus(notificationLogId, "SENT", null);
    return { ok: true, message: translations("testSent") };
  } catch (sendError: unknown) {
    const reason =
      sendError instanceof Error ? sendError.message : "unknown error";
    const errorMessage = translations("sendFailed", { reason });
    await updateNotificationLogStatus(
      notificationLogId,
      "FAILED",
      errorMessage,
    );
    return { ok: false, message: errorMessage };
  }
}
