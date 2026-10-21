"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS, isValidPermission } from "@/lib/permissions";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import type {
  WebhookEvent,
  WebhookPlatform,
} from "../../../prisma/generated/prisma/client";
import {
  getAppearanceSettings,
  getStorageSettings,
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
  trustCenterSettingsSchema,
} from "@/lib/settings/schema";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  WEBHOOK_EVENT_VALUES,
  WEBHOOK_PLATFORM_VALUES,
  validateWebhookTarget,
} from "@/lib/webhooks";
import { storage } from "@/lib/storage";
import {
  isDangerousUploadMime,
  validateMagicBytes,
} from "@/lib/upload-validation";

const ALLOWED_LOGO_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  toggleWebhookEndpoint,
} from "@/lib/db/webhooks";

export type SettingsActionState = { ok: boolean; message: string } | undefined;

const testRecipientSchema = z.email("Enter a valid recipient email address.");

export async function saveOrganizationSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.general");

  const parsed = organizationSettingsSchema.safeParse({
    name: formData.get("name"),
    supportEmail: formData.get("supportEmail") ?? "",
    defaultLocale: formData.get("defaultLocale") ?? undefined,
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    let message = translations("errors.invalidInput");
    if (field === "name") {
      message = translations("errors.nameRequired");
    } else if (field === "supportEmail") {
      message = translations("errors.invalidEmail");
    }
    return { ok: false, message };
  }

  await updateOrganizationSettings(parsed.data);
  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "organization",
    );
  return { ok: true, message: translations("success") };
}

export async function saveEmailSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.email");

  const parsed = emailSettingsSchema.safeParse({
    smtpHost: formData.get("smtpHost") ?? "",
    smtpPort: formData.get("smtpPort") ?? 587,
    smtpUser: formData.get("smtpUser") ?? "",
    fromAddress: formData.get("fromAddress") ?? "",
    fromName: formData.get("fromName") ?? "",
    smtpPassword: formData.get("smtpPassword") ?? "",
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    let message = translations("errors.invalidInput");
    if (field === "fromAddress") {
      message = translations("errors.invalidEmail");
    } else if (field === "smtpPort") {
      message = translations("errors.invalidPort");
    }
    return {
      ok: false,
      message,
    };
  }

  await updateEmailSettings(parsed.data);
  const user = await getCurrentUser();
  if (user)
    await logAudit(user.id, AUDIT_ACTIONS.UPDATE_SETTINGS, "Setting", "email");
  return { ok: true, message: translations("success") };
}

export async function sendSmtpTestAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.email");

  const parsed = testRecipientSchema.safeParse(
    (formData.get("recipient") as string)?.trim() ?? "",
  );
  if (!parsed.success) {
    return {
      ok: false,
      message: translations("errors.invalidRecipient"),
    };
  }

  const { getEmailSettings } = await import("@/lib/settings");
  const { smtpHost } = await getEmailSettings();
  if (!smtpHost) {
    return {
      ok: false,
      message: translations("errors.smtpNotConfigured"),
    };
  }

  const { sendTestEmail } = await import("@/lib/email/mailer");
  const user = await getCurrentUser();
  const result = await sendTestEmail(parsed.data, user?.id);

  if (result.ok) {
    if (user)
      await logAudit(
        user.id,
        AUDIT_ACTIONS.UPDATE_SETTINGS,
        "Setting",
        "email.test",
      );
    return {
      ok: true,
      message: translations("testSuccess", { email: parsed.data }),
    };
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
  const translations = await getTranslations("Admin.email");

  const type = (formData.get("type") as string) ?? "";
  const definition = getEmailTemplateDefinition(type);
  if (!definition) {
    return { ok: false, message: translations("errors.unknownTemplate") };
  }

  const parsed = emailTemplateFieldSchema.safeParse({
    subject: formData.get("subject") ?? "",
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const message =
      field === "body"
        ? translations("errors.bodyRequired")
        : translations("errors.subjectRequired");
    return { ok: false, message };
  }

  await updateEmailTemplateFields({
    [definition.subjectField]: parsed.data.subject,
    [definition.bodyField]: parsed.data.body,
  });
  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      `email.template.${type}`,
    );
  const templateLabel = translations.has(`templateTypes.${type}.label`)
    ? translations(`templateTypes.${type}.label`)
    : definition.label;
  return {
    ok: true,
    message: translations("templateSaved", { name: templateLabel }),
  };
}

export async function resetEmailTemplateAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.email");

  const type = (formData.get("type") as string) ?? "";
  const definition = getEmailTemplateDefinition(type);
  if (!definition) {
    return { ok: false, message: translations("errors.unknownTemplate") };
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
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      `email.template.${type}`,
    );
  const templateLabel = translations.has(`templateTypes.${type}.label`)
    ? translations(`templateTypes.${type}.label`)
    : definition.label;
  return {
    ok: true,
    message: translations("templateReset", { name: templateLabel }),
  };
}

export async function saveScoringSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.scoring");

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
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: translations("errors.invalidInput"),
    };
  }

  await updateScoringSettings(parsed.data);
  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "scoring",
    );
  return { ok: true, message: translations("success") };
}

export async function saveSsoSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.signIn");

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
      message: translations("errors.invalidInput"),
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
  if (user)
    await logAudit(user.id, AUDIT_ACTIONS.UPDATE_SETTINGS, "Setting", "sso");
  return { ok: true, message: translations("success") };
}

export async function generateBreakGlassUrlAction(
  previousState: { ok: boolean; message: string; url?: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; message: string; url?: string }> {
  void formData;
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.signIn");

  const { generateBreakGlassToken, hashBreakGlassToken } =
    await import("@/lib/break-glass");
  const { setBreakGlassHash } = await import("@/lib/settings");
  const { env } = await import("@/lib/env");

  const token = generateBreakGlassToken();
  await setBreakGlassHash(await hashBreakGlassToken(token));

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "sso.breakGlass",
    );
  return {
    ok: true,
    message: translations("breakGlass.success"),
    url: `${env.APP_URL}/login?breakGlass=${token}`,
  };
}

export async function saveAppearanceSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.appearance");

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
      message: translations("errors.primaryHex"),
    };
  }
  if (secondaryHex && !/^#[0-9a-fA-F]{6}$/.test(secondaryHex)) {
    return {
      ok: false,
      message: translations("errors.secondaryHex"),
    };
  }
  if (ragGreenHex && !/^#[0-9a-fA-F]{6}$/.test(ragGreenHex)) {
    return { ok: false, message: translations("errors.ragGreen") };
  }
  if (ragAmberHex && !/^#[0-9a-fA-F]{6}$/.test(ragAmberHex)) {
    return { ok: false, message: translations("errors.ragAmber") };
  }
  if (ragRedHex && !/^#[0-9a-fA-F]{6}$/.test(ragRedHex)) {
    return { ok: false, message: translations("errors.ragRed") };
  }
  if (ragUnscoredHex && !/^#[0-9a-fA-F]{6}$/.test(ragUnscoredHex)) {
    return { ok: false, message: translations("errors.ragUnscored") };
  }

  const previousLogoKey = (await getAppearanceSettings()).logoKey;
  let logoKey = previousLogoKey;
  const logoFile = formData.get("logoFile") as File | null;
  const removeLogo = formData.get("removeLogo") === "true";

  if (removeLogo) {
    logoKey = "";
  } else if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      return { ok: false, message: translations("errors.logoTooLarge") };
    }
    if (
      !logoFile.type.startsWith("image/") ||
      isDangerousUploadMime(logoFile.type)
    ) {
      return { ok: false, message: translations("errors.logoImage") };
    }

    // The declared MIME type is client-controlled, so the extension
    // allowlist and magic bytes are the real gate. SVG is excluded outright:
    // it is scriptable and is served inline from this origin.
    const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_LOGO_EXTENSIONS.has(ext)) {
      return {
        ok: false,
        message: translations("errors.logoFormat"),
      };
    }
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    if (!validateMagicBytes(ext, buffer)) {
      return {
        ok: false,
        message: translations("errors.logoContent"),
      };
    }

    const fileName = `logo-${randomBytes(8).toString("hex")}.${ext}`;
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
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "appearance",
    );
  return { ok: true, message: translations("success") };
}

export async function createApiKeyAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<{ ok: boolean; message: string; key?: string }> {
  await requirePermission(PERMISSIONS.API_MANAGE);
  const translations = await getTranslations("Admin.api");

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { ok: false, message: translations("errors.nameRequired") };
  }

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
        message: translations("errors.permissionsRequired"),
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
    await logAudit(
      user.id,
      AUDIT_ACTIONS.API_KEY_CREATED,
      "ApiKey",
      created.id,
    );
  }

  // Result (incl. the one-time key) is consumed by useActionState; the client
  // refreshes the list after (see useActionFeedback) instead of revalidating
  // the current route, which would drop the returned state in production.
  return {
    ok: true,
    message: translations("keyCreatedMessage", { prefix: displayPrefix }),
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
      disabled ? AUDIT_ACTIONS.API_KEY_REVOKED : AUDIT_ACTIONS.API_KEY_ENABLED,
      "ApiKey",
      keyId,
    );
  }

  revalidatePath("/admin/api");
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
    await logAudit(user.id, AUDIT_ACTIONS.API_KEY_DELETED, "ApiKey", keyId);
  }

  revalidatePath("/admin/api");
}

export async function saveApiSettingsAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.API_MANAGE);
  const translations = await getTranslations("Admin.api");
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
  return { ok: true, message: translations("success") };
}

export async function saveTrustCenterSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.TRUSTCENTER_MANAGE);
  const translations = await getTranslations("Admin.trustCenter");

  const parsed = trustCenterSettingsSchema.safeParse({
    enabled: formData.get("enabled") !== null,
    intro: (formData.get("intro") as string) ?? "",
    contactEmail: (formData.get("contactEmail") as string) ?? "",
    includeInInvites: formData.get("includeInInvites") !== null,
    pageLoadsPerMin: (formData.get("pageLoadsPerMin") as string) || "30",
    downloadsPerMin: (formData.get("downloadsPerMin") as string) || "30",
  });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path.includes("contactEmail")) {
      return { ok: false, message: translations("errors.invalidEmail") };
    }
    return { ok: false, message: translations("errors.invalidInput") };
  }

  const { updateTrustCenterSettings } = await import("@/lib/settings");
  await updateTrustCenterSettings(parsed.data);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "trustcenter",
    );
  }

  return { ok: true, message: translations("success") };
}

export async function saveSchedulingSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.scheduling");

  const escalationDays = parseInt(
    (formData.get("escalationDays") as string) || "3",
    10,
  );
  const defaultDueDays = parseInt(
    (formData.get("defaultDueDays") as string) || "21",
    10,
  );
  const reminderStr = (formData.get("reminderDays") as string) || "";

  if (isNaN(escalationDays) || escalationDays < 1) {
    return { ok: false, message: translations("errors.escalationInvalid") };
  }
  if (isNaN(defaultDueDays) || defaultDueDays < 1) {
    return { ok: false, message: translations("errors.defaultDueInvalid") };
  }

  const reminders = reminderStr
    .split(",")
    .map((day) => parseInt(day.trim(), 10))
    .filter((day) => !isNaN(day) && day >= 0);

  const { updateAssessmentSettings, updateCronSettings } =
    await import("@/lib/settings");

  // Persist only what this tab's form submits. Absent form fields must never
  // fall back to defaults here — each settings tab owns its own save action,
  // so defaults for other tabs' fields would silently reset their values.
  await Promise.all([
    updateCronSettings({
      internalSchedulerEnabled:
        formData.get("internalSchedulerEnabled") === "on",
    }),
    updateAssessmentSettings({
      reminderOffsetDays: reminders.length > 0 ? reminders : [7, 1],
      escalationAfterDays: escalationDays,
      defaultDueInDays: defaultDueDays,
    }),
  ]);

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "scheduling",
    );

  return { ok: true, message: translations("success") };
}

export async function saveSignInSecuritySettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.signIn");

  const loginRateLimit = parseInt(
    (formData.get("loginRateLimit") as string) || "10",
    10,
  );
  const sessionTimeoutMinutes = parseInt(
    (formData.get("sessionTimeoutMinutes") as string) || "30",
    10,
  );

  if (isNaN(loginRateLimit) || loginRateLimit < 1) {
    return {
      ok: false,
      message: translations("errors.loginRateInvalid"),
    };
  }
  if (
    isNaN(sessionTimeoutMinutes) ||
    (sessionTimeoutMinutes > 0 && sessionTimeoutMinutes < 5) ||
    sessionTimeoutMinutes < 0
  ) {
    return {
      ok: false,
      message: translations("errors.autoLogoutInvalid"),
    };
  }

  const { updateAssessmentSettings } = await import("@/lib/settings");
  await updateAssessmentSettings({
    loginRateLimitPerMin: loginRateLimit,
    sessionTimeoutMinutes,
  });

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "sign-in",
    );

  return { ok: true, message: translations("securitySuccess") };
}

export async function saveRateLimitSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.rateLimits");

  const rateLimitFields = {
    portalPageLoadsPerMin: { default: 30 },
    portalUploadsPerMin: { default: 10 },
    portalSubmitPerMin: { default: 5 },
    portalCommentPerMin: { default: 10 },
    portalPasswordAttemptsPerMin: { default: 5 },
    passwordResetPerMin: { default: 1 },
    breakGlassPerMin: { default: 10 },
  } as const;

  const rateLimits: Record<string, number> = {};
  for (const [field, { default: fallback }] of Object.entries(
    rateLimitFields,
  )) {
    const value = parseInt(
      (formData.get(field) as string) || String(fallback),
      10,
    );
    if (isNaN(value) || value < 1) {
      return {
        ok: false,
        message: translations("errors.minimum", {
          field: translations(`fields.${field}.label`),
        }),
      };
    }
    rateLimits[field] = value;
  }

  const { updateAssessmentSettings } = await import("@/lib/settings");
  await updateAssessmentSettings({
    portalPageLoadsPerMin: rateLimits.portalPageLoadsPerMin,
    portalUploadsPerMin: rateLimits.portalUploadsPerMin,
    portalSubmitPerMin: rateLimits.portalSubmitPerMin,
    portalCommentPerMin: rateLimits.portalCommentPerMin,
    portalPasswordAttemptsPerMin: rateLimits.portalPasswordAttemptsPerMin,
    passwordResetPerMin: rateLimits.passwordResetPerMin,
    breakGlassPerMin: rateLimits.breakGlassPerMin,
  });

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "rate-limits",
    );

  return { ok: true, message: translations("success") };
}

export async function saveUploadSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.storage");

  const maxUploadMb = parseInt(
    (formData.get("maxUploadMb") as string) || "20",
    10,
  );
  if (isNaN(maxUploadMb) || maxUploadMb < 1) {
    return { ok: false, message: translations("errors.maxUploadInvalid") };
  }

  const allowedExtensions = formData.getAll("allowedExtensions").map(String);

  const { updateFileSettings } = await import("@/lib/settings");
  await updateFileSettings({
    maxUploadMb,
    allowedExtensions:
      allowedExtensions.length > 0 ? allowedExtensions : ["pdf"],
  });

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "storage",
    );

  return { ok: true, message: translations("uploadsSuccess") };
}

export async function saveAuditRetentionSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const auditRetention = parseInt(
    (formData.get("auditRetention") as string) || "0",
    10,
  );
  if (isNaN(auditRetention) || auditRetention < 0) {
    return {
      ok: false,
      message: "Audit retention must be 0 or a positive number.",
    };
  }

  const { updateAuditRetention } = await import("@/lib/settings");
  await updateAuditRetention(auditRetention);

  const user = await getCurrentUser();
  if (user)
    await logAudit(user.id, AUDIT_ACTIONS.UPDATE_SETTINGS, "Setting", "audit");

  return { ok: true, message: "Audit retention saved." };
}

export async function saveEmailLogRetentionSettings(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.emailTracking");

  const emailLogRetention = parseInt(
    (formData.get("emailLogRetention") as string) || "14",
    10,
  );
  if (isNaN(emailLogRetention) || emailLogRetention < 0) {
    return {
      ok: false,
      message: translations("errors.retentionInvalid"),
    };
  }

  const { updateAssessmentSettings } = await import("@/lib/settings");
  await updateAssessmentSettings({ emailLogRetentionDays: emailLogRetention });

  const user = await getCurrentUser();
  if (user)
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "email-tracking",
    );

  return { ok: true, message: translations("errors.retentionSaved") };
}

export async function retryEmailSendAction(
  previousState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.emailTracking");

  const logId = (formData.get("logId") as string) || "";
  if (!logId) return { ok: false, message: translations("errors.missingLog") };

  const { getEmailLogById } = await import("@/lib/db/notifications");
  const { prisma: db } = await import("@/lib/prisma");
  const { env } = await import("@/lib/env");

  const log = await getEmailLogById(logId);
  if (!log) return { ok: false, message: translations("errors.notFound") };
  if (log.status !== "FAILED")
    return { ok: false, message: translations("errors.onlyFailed") };
  if (log.type === "RESET") {
    return {
      ok: false,
      message: translations("errors.resetSingleUse"),
    };
  }

  const sentById = (await getCurrentUser())?.id;

  if (log.type === "TEST") {
    const { sendTestEmail } = await import("@/lib/email/mailer");
    const result = await sendTestEmail(log.sentTo, sentById, logId);
    if (result.ok) {
      const user = await getCurrentUser();
      if (user)
        await logAudit(
          user.id,
          AUDIT_ACTIONS.RETRY_EMAIL_SEND,
          "NotificationLog",
          logId,
        );
      return { ok: true, message: translations("testResent") };
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

  const { getOrganizationSettings } = await import("@/lib/settings");
  const organizationName =
    (await getOrganizationSettings()).name || "Mitch-Risk";

  const tokens: Record<string, string> = {
    message: "Please review and resubmit your questionnaire.",
    portalPassword: "",
    // Brand placeholder used across templates; without it {{appName}} would
    // reach the recipient verbatim on any template that references it.
    appName: organizationName,
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
      await logAudit(
        user.id,
        AUDIT_ACTIONS.RETRY_EMAIL_SEND,
        "NotificationLog",
        logId,
      );
    return { ok: true, message: translations("retrySuccess") };
  }

  return {
    ok: false,
    message: translations("errors.resendFailed"),
  };
}

export async function saveStorageSettings(
  _previousState: { ok: boolean; message: string } | undefined,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const translations = await getTranslations("Admin.storage");

  const existing = await getStorageSettings();
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
      message: translations("errors.invalidInput"),
    };
  }

  await updateStorageSettings(parsed.data);

  const user = await getCurrentUser();
  if (user) {
    await logAudit(
      user.id,
      AUDIT_ACTIONS.UPDATE_SETTINGS,
      "Setting",
      "storage",
    );
  }

  return { ok: true, message: translations("success") };
}

export type WebhookActionState = { ok?: boolean; message?: string } | undefined;

function isWebhookEvent(value: string): value is WebhookEvent {
  return (WEBHOOK_EVENT_VALUES as readonly string[]).includes(value);
}

function isWebhookPlatform(value: string): value is WebhookPlatform {
  return (WEBHOOK_PLATFORM_VALUES as readonly string[]).includes(value);
}

export async function createWebhookAction(
  _previousState: WebhookActionState,
  formData: FormData,
): Promise<WebhookActionState> {
  const user = await requirePermission(PERMISSIONS.WEBHOOKS_MANAGE);
  const translations = await getTranslations("Admin.webhooks");

  const url = getField(formData, "url");
  const name = getField(formData, "name")?.trim() || "";
  const platform = getField(formData, "platform") || "GENERIC";
  const events = formData.getAll("events").map(String);

  if (!url) {
    return { ok: false, message: translations("errors.urlRequired") };
  }

  if (url.length > 500) {
    return { ok: false, message: translations("errors.urlTooLong") };
  }
  if (name.length > 100) {
    return { ok: false, message: translations("errors.nameTooLong") };
  }

  const targetValidation = validateWebhookTarget(url);
  if (!targetValidation.ok) {
    return {
      ok: false,
      message: translations(`errors.${targetValidation.code}`),
    };
  }

  if (!isWebhookPlatform(platform)) {
    return { ok: false, message: translations("errors.unknownPlatform") };
  }
  const validEvents = [...new Set(events.filter(isWebhookEvent))];
  if (validEvents.length === 0) {
    return { ok: false, message: translations("errors.eventRequired") };
  }

  const secret = randomBytes(32).toString("hex");

  await createWebhookEndpoint({
    url,
    name,
    secret,
    events: validEvents as WebhookEvent[],
    platform: platform as WebhookPlatform,
  });

  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.CREATE_WEBHOOK, "Webhook", url);
  }

  return { ok: true, message: translations("success") };
}

export async function deleteWebhookAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.WEBHOOKS_MANAGE);
  const webhookId = getField(formData, "webhookId");

  if (!webhookId) return;

  await deleteWebhookEndpoint(webhookId);

  if (user) {
    await logAudit(user.id, AUDIT_ACTIONS.DELETE_WEBHOOK, "Webhook", webhookId);
  }

  revalidatePath("/admin/webhooks");
}

export async function toggleWebhookAction(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.WEBHOOKS_MANAGE);
  const webhookId = getField(formData, "webhookId");
  const enabled = getField(formData, "enabled") === "true";

  if (!webhookId) return;

  await toggleWebhookEndpoint(webhookId, enabled);

  if (user) {
    await logAudit(
      user.id,
      enabled ? AUDIT_ACTIONS.ENABLE_WEBHOOK : AUDIT_ACTIONS.DISABLE_WEBHOOK,
      "Webhook",
      webhookId,
    );
  }

  revalidatePath("/admin/webhooks");
}
