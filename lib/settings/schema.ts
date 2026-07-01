import { z } from "zod";

export const organizationSettingsSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .default("mitch-risk"),
  supportEmail: z
    .union([z.literal(""), z.email("Enter a valid email address")])
    .default(""),
});

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;

export const emailSettingsSchema = z.object({
  smtpHost: z.string().default(""),
  smtpPort: z.coerce.number().int().min(1).max(65535).default(587),
  smtpUser: z.string().default(""),
  fromAddress: z
    .union([z.literal(""), z.email("Enter a valid email address")])
    .default(""),
  fromName: z.string().default("mitch-risk"),
  smtpPassword: z.string().default(""),
});

export type EmailSettings = z.infer<typeof emailSettingsSchema>;

export const fileSettingsSchema = z.object({
  maxUploadMb: z.coerce.number().int().min(1).default(20),
  allowedExtensions: z
    .array(z.string())
    .default(["pdf", "png", "jpg", "jpeg", "docx", "xlsx"]),
});

export type FileSettings = z.infer<typeof fileSettingsSchema>;

export const scoringSettingsSchema = z.object({
  riskWeights: z
    .object({
      CRITICAL: z.number(),
      HIGH: z.number(),
      MEDIUM: z.number(),
      LOW: z.number(),
    })
    .catch({ CRITICAL: 10, HIGH: 6, MEDIUM: 3, LOW: 1 }),
  ragThresholds: z
    .object({ amber: z.number(), green: z.number() })
    .catch({ amber: 0.6, green: 0.85 }),
  excludeNotApplicable: z.boolean().catch(true),
});

export type ScoringSettings = z.infer<typeof scoringSettingsSchema>;

export const assessmentSettingsSchema = z.object({
  defaultDueInDays: z.coerce.number().int().min(1).default(21),
  reminderOffsetDays: z.array(z.coerce.number().int().min(0)).default([7, 1]),
  escalationAfterDays: z.coerce.number().int().min(1).default(3),
  loginRateLimitPerMin: z.coerce.number().int().min(1).default(10),
  emailLogRetentionDays: z.coerce.number().int().min(0).default(14),
});

export type AssessmentSettings = z.infer<typeof assessmentSettingsSchema>;

export const emailTemplateSchema = z.object({
  inviteSubject: z
    .string()
    .default("Security questionnaire: {{assessmentTitle}}"),
  inviteBody: z
    .string()
    .default(
      "{{vendorName}}, you have been asked to complete the security questionnaire: {{assessmentTitle}}. Please submit by {{dueDate}}.\n\nOpen: {{portalUrl}}\n\nNo login is required. You can save your progress and return later using the same link.",
    ),
  reminderSubject: z
    .string()
    .default("Reminder: {{assessmentTitle}} due {{dueDate}}"),
  reminderBody: z
    .string()
    .default(
      "{{vendorName}}, this is a reminder to complete your security questionnaire: {{assessmentTitle}}. It is due by {{dueDate}}.\n\nOpen: {{portalUrl}}",
    ),
  escalationSubject: z
    .string()
    .default("Overdue: {{assessmentTitle}} — {{vendorName}}"),
  escalationBody: z
    .string()
    .default(
      "{{reviewerName}}, the questionnaire {{assessmentTitle}} sent to {{vendorName}} is now overdue.\n\nView the assessment: {{assessmentUrl}}",
    ),
});

export type EmailTemplateSettings = z.infer<typeof emailTemplateSchema>;

export const ssoSettingsSchema = z.object({
  entraIdEnabled: z.boolean().default(false),
  entraIdClientId: z.string().default(""),
  googleEnabled: z.boolean().default(false),
  googleClientId: z.string().default(""),
  oidcEnabled: z.boolean().default(false),
  oidcName: z.string().default(""),
  oidcIssuer: z.string().default(""),
  oidcClientId: z.string().default(""),
  autoProvisionRole: z.enum(["ADMIN", "REVIEWER"]).default("REVIEWER"),
  allowedDomain: z.string().default(""),
});

export type SsoSettings = z.infer<typeof ssoSettingsSchema>;

export const appearanceSettingsSchema = z.object({
  primaryHex: z.string().default(""),
  secondaryHex: z.string().default(""),
  logoKey: z.string().default(""),
  ragGreenHex: z.string().default(""),
  ragAmberHex: z.string().default(""),
  ragRedHex: z.string().default(""),
  ragUnscoredHex: z.string().default(""),
});

export type AppearanceSettings = z.infer<typeof appearanceSettingsSchema>;
