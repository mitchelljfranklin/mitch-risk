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
  sessionTimeoutMinutes: z.coerce.number().int().min(0).default(30),
  // Per-minute rate limits (see lib/rate-limit.ts). Configurable so admins can
  // loosen/tighten abuse protection without a redeploy.
  portalPageLoadsPerMin: z.coerce.number().int().min(1).default(30),
  portalUploadsPerMin: z.coerce.number().int().min(1).default(10),
  portalSubmitPerMin: z.coerce.number().int().min(1).default(5),
  portalCommentPerMin: z.coerce.number().int().min(1).default(10),
  portalPasswordAttemptsPerMin: z.coerce.number().int().min(1).default(5),
  passwordResetPerMin: z.coerce.number().int().min(1).default(1),
  breakGlassPerMin: z.coerce.number().int().min(1).default(10),
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
  submissionSubject: z
    .string()
    .default("{{vendorName}} submitted {{assessmentTitle}} for review"),
  submissionBody: z
    .string()
    .default(
      "{{reviewerName}}, {{vendorName}} has submitted their security questionnaire: {{assessmentTitle}}.\n\nView the assessment: {{assessmentUrl}}",
    ),
  clarificationSubject: z
    .string()
    .default("More information needed: {{assessmentTitle}}"),
  clarificationBody: z
    .string()
    .default(
      "{{vendorName}}, your security questionnaire {{assessmentTitle}} has been sent back for more information.\n\n{{message}}\n\nPlease review the requested items and resubmit: {{portalUrl}}\n\nYour previous answers have been saved.",
    ),
  resetSubject: z.string().default("Password reset"),
  resetBody: z
    .string()
    .default(
      "A password reset was requested for your {{appName}} account.\n\nClick here to reset your password: {{resetUrl}}\n\nThis link expires in {{expiresIn}}.",
    ),
  expirySubject: z
    .string()
    .default("Expiring soon: {{itemName}} for {{vendorName}}"),
  expiryBody: z
    .string()
    .default(
      "{{itemName}} for {{vendorName}} expires on {{expiresDate}}.\n\nReview the vendor and arrange a re-assessment or renewal: {{vendorUrl}}",
    ),
  invitePasswordSubject: z
    .string()
    .default("Security questionnaire: {{assessmentTitle}}"),
  invitePasswordBody: z
    .string()
    .default(
      "{{vendorName}}, you have been asked to complete the security questionnaire: {{assessmentTitle}}. Please submit by {{dueDate}}.\n\nThis questionnaire is password protected.\nYour password: {{portalPassword}}\n\nOpen: {{portalUrl}}\n\nYour answers are saved automatically. You can close this page and return using the same link at any time.",
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
  autoProvisionRoleId: z.string().default(""),
  allowedDomain: z.string().default(""),
  disableLocalAuth: z.boolean().default(false),
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
  borderRadius: z.coerce.number().min(0).max(16).default(10),
  pageWidth: z.enum(["constrained", "full"]).default("constrained"),
});

export type AppearanceSettings = z.infer<typeof appearanceSettingsSchema>;

export const storageSettingsSchema = z.object({
  provider: z.enum(["local", "s3", "azure"]).default("local"),
  s3Bucket: z.string().default(""),
  s3Region: z.string().default(""),
  s3AccessKeyId: z.string().default(""),
  s3SecretAccessKey: z.string().default(""),
  azureConnectionString: z.string().default(""),
  azureContainerName: z.string().default(""),
});

export type StorageSettings = z.infer<typeof storageSettingsSchema>;

export const cronSettingsSchema = z.object({
  internalSchedulerEnabled: z.boolean().default(true),
});

export type CronSettings = z.infer<typeof cronSettingsSchema>;
