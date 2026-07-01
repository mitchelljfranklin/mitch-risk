"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/db/audit";
import {
  updateEmailSettings,
  updateEmailTemplateSettings,
  updateOrganizationSettings,
  updateScoringSettings,
  updateSsoSettings,
  updateAppearanceSettings,
} from "@/lib/settings";
import { persistSsoSecrets } from "@/lib/settings";
import {
  emailSettingsSchema,
  emailTemplateSchema,
  organizationSettingsSchema,
  scoringSettingsSchema,
  ssoSettingsSchema,
} from "@/lib/settings/schema";
import { randomBytes } from "node:crypto";
import { storage } from "@/lib/storage";

export type SettingsActionState = { ok: boolean; message: string } | undefined;

export async function saveOrganizationSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

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
  revalidatePath("/settings", "layout");
  return { ok: true, message: "Organization settings saved." };
}

export async function saveEmailSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

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
  revalidatePath("/settings");
  return { ok: true, message: "Email settings saved." };
}

export async function saveEmailTemplateSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const parsed = emailTemplateSchema.safeParse({
    inviteSubject: formData.get("inviteSubject") ?? "",
    inviteBody: formData.get("inviteBody") ?? "",
    reminderSubject: formData.get("reminderSubject") ?? "",
    reminderBody: formData.get("reminderBody") ?? "",
    escalationSubject: formData.get("escalationSubject") ?? "",
    escalationBody: formData.get("escalationBody") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  await updateEmailTemplateSettings(parsed.data);
  const user = await getCurrentUser();
  if (user)
    await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "email.template");
  revalidatePath("/settings");
  return { ok: true, message: "Email templates saved." };
}

export async function saveScoringSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

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
  revalidatePath("/settings");
  return { ok: true, message: "Scoring settings saved." };
}

export async function saveSsoSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const parsed = ssoSettingsSchema.safeParse({
    entraIdEnabled: formData.get("entraIdEnabled") === "on",
    entraIdClientId: formData.get("entraIdClientId") ?? "",
    googleEnabled: formData.get("googleEnabled") === "on",
    googleClientId: formData.get("googleClientId") ?? "",
    oidcEnabled: formData.get("oidcEnabled") === "on",
    oidcName: formData.get("oidcName") ?? "",
    oidcIssuer: formData.get("oidcIssuer") ?? "",
    oidcClientId: formData.get("oidcClientId") ?? "",
    autoProvisionRole: formData.get("autoProvisionRole") ?? "REVIEWER",
    allowedDomain: formData.get("allowedDomain") ?? "",
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

  revalidatePath("/settings");
  const user = await getCurrentUser();
  if (user) await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "sso");
  return { ok: true, message: "SSO settings saved." };
}

export async function saveAppearanceSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

  const primaryHex = (formData.get("primaryHex") as string) || "";
  const secondaryHex = (formData.get("secondaryHex") as string) || "";
  const ragGreenHex = (formData.get("ragGreenHex") as string) || "";
  const ragAmberHex = (formData.get("ragAmberHex") as string) || "";
  const ragRedHex = (formData.get("ragRedHex") as string) || "";
  const ragUnscoredHex = (formData.get("ragUnscoredHex") as string) || "";

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

  let logoKey = (formData.get("logoKey") as string) || "";
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
  });

  revalidatePath("/", "layout");
  const user = await getCurrentUser();
  if (user) await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "appearance");
  return { ok: true, message: "Appearance settings saved." };
}

export async function createApiKeyAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<{ ok: boolean; message: string; key?: string }> {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { ok: false, message: "Key name is required." };

  const expiresIn = (formData.get("expiresIn") as string) || "";
  const allowedIps = (formData.get("allowedIps") as string) || "";
  const rateLimitStr = (formData.get("rateLimit") as string) || "";

  const { generateApiKey, hashApiKey } = await import("@/lib/api-keys");
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma: db } = await import("@/lib/prisma");
  const { logAudit } = await import("@/lib/db/audit");

  const user = await getCurrentUser();
  const { fullKey, prefix } = generateApiKey();

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
      keyHash: hashApiKey(fullKey),
      prefix,
      createdBy: user!.id,
      expiresAt,
      allowedIps,
      rateLimitPerMin: rateLimitStr ? parseInt(rateLimitStr, 10) || null : null,
    },
  });

  if (user) {
    await logAudit(user.id, "API_KEY_CREATED", "ApiKey", created.id);
  }

  revalidatePath("/settings");
  return {
    ok: true,
    message: `Key created: ${prefix}. Copy the key below — it won't be shown again.`,
    key: fullKey,
  };
}

export async function toggleApiKeyAction(formData: FormData): Promise<void> {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const { prisma: db } = await import("@/lib/prisma");

  const enabled = formData.get("enabled") === "on";

  await db.appSetting.upsert({
    where: { key: "api.enabled" },
    update: { value: enabled },
    create: { key: "api.enabled", category: "api", value: enabled },
  });

  revalidatePath("/settings");
  return { ok: true, message: "API settings saved." };
}

export async function saveSchedulingSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

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
  const reminderStr = (formData.get("reminderDays") as string) || "";

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
    }),
    updateFileSettings({
      maxUploadMb,
      allowedExtensions:
        allowedExtensions.length > 0 ? allowedExtensions : ["pdf"],
    }),
  ]);

  const user = await getCurrentUser();
  if (user) await logAudit(user.id, "UPDATE_SETTINGS", "Setting", "scheduling");

  revalidatePath("/settings");
  return { ok: true, message: "Configuration saved." };
}

export async function retryEmailSendAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requireAdmin();

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

  const type = log.type.toLowerCase() as "invite" | "reminder" | "escalation";

  const tokens: Record<string, string> = {};

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
