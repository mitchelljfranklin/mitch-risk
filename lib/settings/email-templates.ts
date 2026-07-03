import { type EmailTemplateSettings, emailTemplateSchema } from "./schema";

export type EmailTemplateType =
  | "invite"
  | "invite-password"
  | "reminder"
  | "escalation"
  | "submission"
  | "clarification"
  | "reset";

export type EmailTemplateDefinition = {
  type: EmailTemplateType;
  label: string;
  description: string;
  subjectField: keyof EmailTemplateSettings;
  bodyField: keyof EmailTemplateSettings;
};

export const EMAIL_TEMPLATE_DEFINITIONS: readonly EmailTemplateDefinition[] = [
  {
    type: "invite",
    label: "Invite email",
    description: "Sent to a vendor when a questionnaire is first shared.",
    subjectField: "inviteSubject",
    bodyField: "inviteBody",
  },
  {
    type: "invite-password",
    label: "Invite email (password protected)",
    description: "Invite variant that includes the portal access password.",
    subjectField: "invitePasswordSubject",
    bodyField: "invitePasswordBody",
  },
  {
    type: "reminder",
    label: "Reminder email",
    description: "Nudge sent to a vendor as the due date approaches.",
    subjectField: "reminderSubject",
    bodyField: "reminderBody",
  },
  {
    type: "escalation",
    label: "Escalation email",
    description: "Sent to the reviewer when a questionnaire becomes overdue.",
    subjectField: "escalationSubject",
    bodyField: "escalationBody",
  },
  {
    type: "submission",
    label: "Submission received email",
    description: "Notifies the reviewer that a vendor has submitted answers.",
    subjectField: "submissionSubject",
    bodyField: "submissionBody",
  },
  {
    type: "clarification",
    label: "Sent back for clarification email",
    description:
      "Sent to a vendor when the assessment is reopened for more information.",
    subjectField: "clarificationSubject",
    bodyField: "clarificationBody",
  },
  {
    type: "reset",
    label: "Password reset email",
    description: "Sent to internal staff who request a password reset.",
    subjectField: "resetSubject",
    bodyField: "resetBody",
  },
] as const;

export function getEmailTemplateDefinition(
  type: string,
): EmailTemplateDefinition | undefined {
  return EMAIL_TEMPLATE_DEFINITIONS.find(
    (definition) => definition.type === type,
  );
}

export function getEmailTemplateDefaults(): EmailTemplateSettings {
  return emailTemplateSchema.parse({});
}
