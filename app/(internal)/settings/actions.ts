"use server";

import { revalidatePath } from "next/cache";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS, isValidPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit";
import {
  getAppearanceSettings,
  updateEmailSettings,
  updateEmailTemplateFields,
  updateOrganizationSettings,
  updateScoringSettings,
  updateSsoSettings,
  updateAppearanceSettings,
  updateStorageSettings,
} from "@/lib/settings";
import { persistSsoSecrets } from "@/lib/settings";
import {
  getEmailTemplateDefaults,
  getEmailTemplateDefinition,
} from "@/lib/settings/email-templates";
import {
  emailSettingsSchema,
  organizationSettingsSchema,
  scoringSettingsSchema,
  ssoSettingsSchema,
  storageSettingsSchema,
} from "@/lib/settings/schema";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { storage } from "@/lib/storage";

export type SettingsActionState = { ok: boolean; message: string } | undefined;

const testRecipientSchema = z.email("Enter a valid recipient email address.");

export async function saveOrganizationSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = organizationSettingsSchema.safeParse({
    name: formData.get("name"),
    supportEmail: formData.get("supportEmail") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateOrganizationSettings(parsed.data);
  const user = await getCurrentUser();
  if (user)
    await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "organization");
  return { ok: true, message: "Organization settings saved." };
}

export async function saveEmailSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = emailSettingsSchema.safeParse({
    smtpHost: formData.get("smtpHost") ?? "",
    smtpPort: formData.get("smtpPort") ?? 587,
    smtpUser: formData.get("smtpUser") ?? "",
    fromAddress: formData.get("fromAddress") ?? "",
    fromName: formData.get("fromName") ?? "",
    smtpPassword: formData.get("smtpPassword") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateEmailSettings(parsed.data);
  const user = await getCurrentUser();
  if (user) await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "email");
  return { ok: true, message: "Email settings saved." };
}

export async function sendSmtpTestAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = testRecipientSchema.safeParse(
    (formData.get("recipient") as string)?.trim() ?? "",
  );
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid recipient.",
    };
  }

  const { getEmailSettings } = await import("@/lib/settings");
  const { smtpHost } = await getEmailSettings();
  if (!smtpHost) {
    return {
      ok: false,
      message: "Save your SMTP settings before sending a test email.",
    };
  }

  const { sendTestEmail } = await import("@/lib/email/mailer");
  const user = await getCurrentUser();
  const result = await sendTestEmail(parsed.data, user?.id);

  if (result.ok) {
    if (user)
      await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "email.test");
    return { ok: true, message: `Test email sent to ${parsed.data}.` };
  }

  return { ok: false, message: result.message };
}

const emailTemplateFieldSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required."),
  body: z.string().trim().min(1, "Body is required."),
});

export async function saveEmailTemplateAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const type = (formData.get("type") as string) ?? "";
  const definition = getEmailTemplateDefinition(type);
  if (!definition) {
    return { ok: false, message: "Unknown email template." };
  }

  const parsed = emailTemplateFieldSchema.safeParse({
    subject: formData.get("subject") ?? "",
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateEmailTemplateFields({
    [definition.subjectField]: parsed.data.subject,
    [definition.bodyField]: parsed.data.body,
  });
  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      "UPDATE_SETTINGS",
      "Setting",
      `email.template.${type}`,
    );
  return { ok: true, message: `${definition.label} saved.` };
}

export async function resetEmailTemplateAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const type = (formData.get("type") as string) ?? "";
  const definition = getEmailTemplateDefinition(type);
  if (!definition) {
    return { ok: false, message: "Unknown email template." };
  }

  const defaults = getEmailTemplateDefaults();
  await updateEmailTemplateFields({
    [definition.subjectField]: defaults[definition.subjectField],
    [definition.bodyField]: defaults[definition.bodyField],
  });
  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      "UPDATE_SETTINGS",
      "Setting",
      `email.template.${type}`,
    );
  return { ok: true, message: `${definition.label} reset to default.` };
}

export async function saveScoringSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = scoringSettingsSchema.safeParse({
    riskWeights: {
      CRITICAL: Number(formData.get("criticalWeight") ?? 10),
      HIGH: Number(formData.get("highWeight") ?? 6),
      MEDIUM: Number(formData.get("mediumWeight") ?? 3),
      LOW: Number(formData.get("lowWeight") ?? 1),
    },
    ragThresholds: {
      amber: Number(formData.get("ragAmber") ?? 0.6),
      green: Number(formData.get("ragGreen") ?? 0.85),
    },
    excludeNotApplicable: true,
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateScoringSettings(parsed.data);
  const user = await getCurrentUser();
  if (user) await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "scoring");
  return { ok: true, message: "Scoring settings saved." };
}

export async function saveSsoSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = ssoSettingsSchema.safeParse({
    entraIdEnabled: formData.get("entraIdEnabled") === "on",
    entraIdClientId: formData.get("entraIdClientId") ?? "",
    googleEnabled: formData.get("googleEnabled") === "on",
    googleClientId: formData.get("googleClientId") ?? "",
    oidcEnabled: formData.get("oidcEnabled") === "on",
    oidcName: formData.get("oidcName") ?? "",
    oidcIssuer: formData.get("oidcIssuer") ?? "",
    oidcClientId: formData.get("oidcClientId") ?? "",
    autoProvisionRoleId: formData.get("autoProvisionRoleId") ?? "",
    allowedDomain: formData.get("allowedDomain") ?? "",
    disableLocalAuth: formData.get("disableLocalAuth") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateSsoSettings(parsed.data);

  await persistSsoSecrets({
    entraIdClientSecret:
      (formData.get("entraIdClientSecret") as string) || undefined,
    googleClientSecret:
      (formData.get("googleClientSecret") as string) || undefined,
    oidcClientSecret: (formData.get("oidcClientSecret") as string) || undefined,
  });

  const user = await getCurrentUser();
  if (user) await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "sso");
  return { ok: true, message: "SSO settings saved." };
}

export async function generateBreakGlassUrlAction(
  previousState: { ok: boolean; message: string; url?: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; message: string; url?: string }> {
  void formData;
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const { generateBreakGlassToken, hashBreakGlassToken } =
    await import("@/lib/break-glass");
  const { setBreakGlassHash } = await import("@/lib/settings");
  const { env } = await import("@/lib/env");

  const token = generateBreakGlassToken();
  await setBreakGlassHash(hashBreakGlassToken(token));

  const user = await getCurrentUser();
  if (user)
    await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "sso.breakGlass");
  return {
    ok: true,
    message:
      "Break-glass URL generated. Copy it now — it won't be shown again.",
    url: `${env.APP_URL}/login?breakGlass=${token}`,
  };
}

export async function saveAppearanceSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const primaryHex = (formData.get("primaryHex") as string) || "";
  const secondaryHex = (formData.get("secondaryHex") as string) || "";
  const ragGreenHex = (formData.get("ragGreenHex") as string) || "";
  const ragAmberHex = (formData.get("ragAmberHex") as string) || "";
  const ragRedHex = (formData.get("ragRedHex") as string) || "";
  const ragUnscoredHex = (formData.get("ragUnscoredHex") as string) || "";
  const borderRadius = parseInt(
    (formData.get("borderRadius") as string) || "10",
    10,
  );
  const pageWidth = (formData.get("pageWidth") as string) || "constrained";

  if (primaryHex && !/^#[0-9a-fA-F]{6}$/.test(primaryHex)) {
    return {
      ok: false,
      message: "Primary color must be a valid hex color (e.g. #3b82f6).",
    };
  }
  if (secondaryHex && !/^#[0-9a-fA-F]{6}$/.test(secondaryHex)) {
    return {
      ok: false,
      message: "Secondary color must be a valid hex color (e.g. #f59e0b).",
    };
  }
  if (ragGreenHex && !/^#[0-9a-fA-F]{6}$/.test(ragGreenHex)) {
    return { ok: false, message: "RAG green must be a valid hex color." };
  }
  if (ragAmberHex && !/^#[0-9a-fA-F]{6}$/.test(ragAmberHex)) {
    return { ok: false, message: "RAG amber must be a valid hex color." };
  }
  if (ragRedHex && !/^#[0-9a-fA-F]{6}$/.test(ragRedHex)) {
    return { ok: false, message: "RAG red must be a valid hex color." };
  }
  if (ragUnscoredHex && !/^#[0-9a-fA-F]{6}$/.test(ragUnscoredHex)) {
    return { ok: false, message: "RAG unscored must be a valid hex color." };
  }

  const previousLogoKey = (await getAppearanceSettings()).logoKey;
  let logoKey = previousLogoKey;
  const logoFile = formData.get("logoFile") as File | null;
  const removeLogo = formData.get("removeLogo") === "true";

  if (removeLogo) {
    logoKey = "";
  } else if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      return { ok: false, message: "Logo must be under 2 MB." };
    }
    if (!logoFile.type.startsWith("image/")) {
      return { ok: false, message: "Logo must be an image file." };
    }

    const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const fileName = `logo-${randomBytes(8).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    await storage.save(fileName, buffer);
    logoKey = fileName;
  }

  await updateAppearanceSettings({
    primaryHex: primaryHex || "",
    secondaryHex: secondaryHex || "",
    logoKey,
    ragGreenHex: ragGreenHex || "",
    ragAmberHex: ragAmberHex || "",
    ragRedHex: ragRedHex || "",
    ragUnscoredHex: ragUnscoredHex || "",
    borderRadius:
      isNaN(borderRadius) || borderRadius < 0 || borderRadius > 16
        ? 10
        : borderRadius,
    pageWidth:
      pageWidth === "constrained" || pageWidth === "full"
        ? pageWidth
        : "constrained",
  });

  if (previousLogoKey && previousLogoKey !== logoKey) {
    try {
      await storage.delete(previousLogoKey);
    } catch {
      // Best-effort; orphan-sweep cron cleans any leftovers.
    }
  }

  const user = await getCurrentUser();
  if (user) await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "appearance");
  return { ok: true, message: "Appearance settings saved." };
}

export async function createApiKeyAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<{ ok: boolean; message: string; key?: string }> {
  await requirePermission(PERMISSIONS.API_MANAGE);

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { ok: false, message: "Key name is required." };

  const expiresIn = (formData.get("expiresIn") as string) || "";
  const allowedIps = (formData.get("allowedIps") as string) || "";
  const rateLimitStr = (formData.get("rateLimit") as string) || "";

  const rawPermissions = formData.getAll("permissions") as string[];
  const hasFullAccess = formData.get("fullAccess") !== null;
  let permissions: string[] = [];
  if (!hasFullAccess && rawPermissions.length > 0) {
    permissions = rawPermissions.filter(isValidPermission);
    if (permissions.length === 0) {
      return {
        ok: false,
        message: "Select at least one permission or enable full access.",
      };
    }
  }

  const { generateApiKey, hashApiKey } = await import("@/lib/api-keys");
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma: db } = await import("@/lib/prisma");
  const { logAudit } = await import("@/lib/db/audit");

  const user = await getCurrentUser();
  const { fullKey, keyPrefix, displayPrefix } = generateApiKey();

  let expiresAt: Date | null = null;
  if (expiresIn && expiresIn !== "permanent") {
    const days = parseInt(expiresIn, 10);
    if (days > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
    }
  }

  const created = await db.apiKey.create({
    data: {
      name,
      keyHash: await hashApiKey(fullKey),
      keyPrefix,
      prefix: displayPrefix,
      createdBy: user!.id,
      expiresAt,
      allowedIps,
      rateLimitPerMin: rateLimitStr ? parseInt(rateLimitStr, 10) || null : null,
      permissions,
    },
  });

  if (user) {
    await logAudit(user.id, "API_KEY_CREATED", "ApiKey", created.id);
  }

  // Result (incl. the one-time key) is consumed by useActionState; the client
  // refreshes the list after (see useActionFeedback) instead of revalidating
  // the current route, which would drop the returned state in production.
  return {
    ok: true,
    message: `Key created: ${displayPrefix}. Copy the key below — it won't be shown again.`,
    key: fullKey,
  };
}

export async function toggleApiKeyAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.API_MANAGE);
  const { prisma: db } = await import("@/lib/prisma");
  const { getCurrentUser } = await import("@/lib/auth");
  const { logAudit } = await import("@/lib/db/audit");

  const keyId = formData.get("keyId") as string;
  const disabled = formData.get("disabled") === "true";

  await db.apiKey.update({ where: { id: keyId }, data: { disabled } });

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      disabled ? "API_KEY_REVOKED" : "API_KEY_ENABLED",
      "ApiKey",
      keyId,
    );
  }

  revalidatePath("/settings");
}

export async function deleteApiKeyAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.API_MANAGE);
  const { prisma: db } = await import("@/lib/prisma");
  const { getCurrentUser } = await import("@/lib/auth");
  const { logAudit } = await import("@/lib/db/audit");

  const keyId = formData.get("keyId") as string;
  await db.apiKey.delete({ where: { id: keyId } });

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "API_KEY_DELETED", "ApiKey", keyId);
  }

  revalidatePath("/settings");
}

export async function saveApiSettingsAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.API_MANAGE);
  const { prisma: db } = await import("@/lib/prisma");

  const enabled = formData.get("enabled") === "on";

  await db.appSetting.upsert({
    where: { key: "api.enabled" },
    update: { value: enabled },
    create: { key: "api.enabled", category: "api", value: enabled },
  });

  // No revalidatePath: this result is consumed by useActionState. Revalidating
  // the current route races with the returned state in production builds and can
  // drop the success toast. The client refreshes after handling the result.
  return { ok: true, message: "API settings saved." };
}

export async function saveSchedulingSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const auditRetention = parseInt(
    (formData.get("auditRetention") as string) || "0",
    10,
  );
  const emailLogRetention = parseInt(
    (formData.get("emailLogRetention") as string) || "14",
    10,
  );
  const escalationDays = parseInt(
    (formData.get("escalationDays") as string) || "3",
    10,
  );
  const defaultDueDays = parseInt(
    (formData.get("defaultDueDays") as string) || "21",
    10,
  );
  const maxUploadMb = parseInt(
    (formData.get("maxUploadMb") as string) || "20",
    10,
  );
  const loginRateLimit = parseInt(
    (formData.get("loginRateLimit") as string) || "10",
    10,
  );
  const sessionTimeoutMinutes = parseInt(
    (formData.get("sessionTimeoutMinutes") as string) || "30",
    10,
  );
  const reminderStr = (formData.get("reminderDays") as string) || "";

  const rateLimitFields = {
    portalPageLoadsPerMin: { label: "Portal page loads", default: 30 },
    portalUploadsPerMin: { label: "Portal uploads", default: 10 },
    portalSubmitPerMin: { label: "Portal submissions", default: 5 },
    portalPasswordAttemptsPerMin: {
      label: "Portal password attempts",
      default: 5,
    },
    passwordResetPerMin: { label: "Password reset requests", default: 1 },
    breakGlassPerMin: { label: "Break-glass attempts", default: 10 },
  } as const;

  const rateLimits: Record<string, number> = {};
  for (const [field, { label, default: fallback }] of Object.entries(
    rateLimitFields,
  )) {
    const value = parseInt(
      (formData.get(field) as string) || String(fallback),
      10,
    );
    if (isNaN(value) || value < 1) {
      return { ok: false, message: `${label} must be at least 1 per minute.` };
    }
    rateLimits[field] = value;
  }

  if (isNaN(auditRetention) || auditRetention < 0) {
    return {
      ok: false,
      message: "Audit retention must be 0 or a positive number.",
    };
  }
  if (isNaN(emailLogRetention) || emailLogRetention < 0) {
    return {
      ok: false,
      message: "Email log retention must be 0 or a positive number.",
    };
  }
  if (isNaN(escalationDays) || escalationDays < 1) {
    return { ok: false, message: "Escalation days must be at least 1." };
  }
  if (isNaN(defaultDueDays) || defaultDueDays < 1) {
    return { ok: false, message: "Default due days must be at least 1." };
  }
  if (isNaN(maxUploadMb) || maxUploadMb < 1) {
    return { ok: false, message: "Maximum upload size must be at least 1 MB." };
  }
  if (isNaN(loginRateLimit) || loginRateLimit < 1) {
    return {
      ok: false,
      message: "Login rate limit must be at least 1 per minute.",
    };
  }
  if (
    isNaN(sessionTimeoutMinutes) ||
    (sessionTimeoutMinutes > 0 && sessionTimeoutMinutes < 5) ||
    sessionTimeoutMinutes < 0
  ) {
    return {
      ok: false,
      message: "Auto-logout must be 0 (disabled) or at least 5 minutes.",
    };
  }

  const reminders = reminderStr
    .split(",")
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !isNaN(d) && d >= 0);

  const allowedExtensions = formData.getAll("allowedExtensions").map(String);

  const {
    updateAssessmentSettings,
    updateFileSettings,
    updateAuditRetention,
    updateEmailLogRetention,
  } = await import("@/lib/settings");

  await Promise.all([
    updateAuditRetention(auditRetention),
    updateEmailLogRetention(emailLogRetention),
    updateAssessmentSettings({
      reminderOffsetDays: reminders.length > 0 ? reminders : [7, 1],
      escalationAfterDays: escalationDays,
      defaultDueInDays: defaultDueDays,
      loginRateLimitPerMin: loginRateLimit,
      emailLogRetentionDays: emailLogRetention,
      sessionTimeoutMinutes,
      portalPageLoadsPerMin: rateLimits.portalPageLoadsPerMin,
      portalUploadsPerMin: rateLimits.portalUploadsPerMin,
      portalSubmitPerMin: rateLimits.portalSubmitPerMin,
      portalPasswordAttemptsPerMin: rateLimits.portalPasswordAttemptsPerMin,
      passwordResetPerMin: rateLimits.passwordResetPerMin,
      breakGlassPerMin: rateLimits.breakGlassPerMin,
    }),
    updateFileSettings({
      maxUploadMb,
      allowedExtensions:
        allowedExtensions.length > 0 ? allowedExtensions : ["pdf"],
    }),
  ]);

  const user = await getCurrentUser();
  if (user) await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "scheduling");

  return { ok: true, message: "Configuration saved." };
}

export async function retryEmailSendAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const logId = (formData.get("logId") as string) || "";
  if (!logId) return { ok: false, message: "Missing email log entry." };

  const { getEmailLogById } = await import("@/lib/db/notifications");
  const { prisma: db } = await import("@/lib/prisma");
  const { env } = await import("@/lib/env");

  const log = await getEmailLogById(logId);
  if (!log) return { ok: false, message: "Email log entry not found." };
  if (log.status !== "FAILED")
    return { ok: false, message: "Only failed emails can be retried." };

  const sentById = (await getCurrentUser())?.id;

  if (log.type === "TEST") {
    const { sendTestEmail } = await import("@/lib/email/mailer");
    const result = await sendTestEmail(log.sentTo, sentById, logId);
    if (result.ok) {
      const user = await getCurrentUser();
      if (user)
        await logAudit(user.id, "RETRY_EMAIL_SEND", "NotificationLog", logId);
      revalidatePath("/settings");
      return { ok: true, message: "Test email resent." };
    }
    return { ok: false, message: result.message };
  }

  const { sendEmail } = await import("@/lib/email/mailer");

  const type = log.type.toLowerCase() as
    | "invite"
    | "invite-password"
    | "reminder"
    | "escalation"
    | "submission"
    | "clarification"
    | "reset";

  const tokens: Record<string, string> = {
    message: "Please review and resubmit your questionnaire.",
    portalPassword: "",
  };

  if (log.assessmentId) {
    const assessment = await db.assessment.findUnique({
      where: { id: log.assessmentId },
      select: {
        title: true,
        accessToken: true,
        dueDate: true,
        vendor: { select: { name: true } },
        reviewer: { select: { name: true } },
      },
    });

    if (assessment) {
      tokens.vendorName = assessment.vendor.name;
      tokens.assessmentTitle = assessment.title;
      tokens.portalUrl = assessment.accessToken
        ? `${env.APP_URL}/portal/${assessment.accessToken}`
        : env.APP_URL;
      tokens.dueDate = assessment.dueDate
        ? assessment.dueDate.toISOString().slice(0, 10)
        : "";
      tokens.reviewerName = assessment.reviewer?.name ?? "Reviewer";
      tokens.assessmentUrl = `${env.APP_URL}/assessments/${log.assessmentId}`;
    }
  }

  const result = await sendEmail(log.sentTo, type, tokens, {
    assessmentId: log.assessmentId ?? undefined,
    sentById,
    updateLogId: logId,
  });

  if (result.ok) {
    const user = await getCurrentUser();
    if (user)
      await logAudit(user.id, "RETRY_EMAIL_SEND", "NotificationLog", logId);
    revalidatePath("/settings");
    return { ok: true, message: `Email resent successfully.` };
  }

  return {
    ok: false,
    message: "Failed to resend email. Check the tracking tab for details.",
  };
}

export async function saveStorageSettings(
  _previousState: { ok: boolean; message: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const existing = await getAppearanceSettings();
  const raw: Record<string, string> = {
    provider: String(formData.get("provider") ?? "local"),
    s3Bucket: String(formData.get("s3Bucket") ?? ""),
    s3Region: String(formData.get("s3Region") ?? ""),
    s3AccessKeyId: String(formData.get("s3AccessKeyId") ?? ""),
    s3SecretAccessKey: String(formData.get("s3SecretAccessKey") ?? ""),
    azureConnectionString: String(formData.get("azureConnectionString") ?? ""),
    azureContainerName: String(formData.get("azureContainerName") ?? ""),
  };

  if (raw.s3SecretAccessKey === "" && existing) {
    raw.s3SecretAccessKey =
      (existing as unknown as Record<string, string>).s3SecretAccessKey ?? "";
  }
  if (raw.azureConnectionString === "" && existing) {
    raw.azureConnectionString =
      (existing as unknown as Record<string, string>).azureConnectionString ??
      "";
  }

  const parsed = storageSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateStorageSettings(parsed.data);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(user.id, "UPDATE_SETTINGS", "Settings", "storage");
  }

  return { ok: true, message: "Storage settings saved." };
}
