import { type Prisma } from "@prisma/client";
import { cache } from "react";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

import {
  type AssessmentSettings,
  type EmailSettings,
  type EmailTemplateSettings,
  type FileSettings,
  type OrganizationSettings,
  type ScoringSettings,
  type SsoSettings,
  type AppearanceSettings,
  type StorageSettings,
  assessmentSettingsSchema,
  emailSettingsSchema,
  emailTemplateSchema,
  fileSettingsSchema,
  organizationSettingsSchema,
  scoringSettingsSchema,
  ssoSettingsSchema,
  appearanceSettingsSchema,
  storageSettingsSchema,
} from "./schema";

function makeKey(category: string, field: string): string {
  return `${category}.${field}`;
}

const NO_SECRETS = new Set<string>();

async function readCategoryRecord(
  category: string,
): Promise<Record<string, unknown>> {
  const rows = await prisma.appSetting.findMany({ where: { category } });
  const record: Record<string, unknown> = {};
  const prefix = `${category}.`;

  for (const row of rows) {
    const field = row.key.startsWith(prefix)
      ? row.key.slice(prefix.length)
      : row.key;
    record[field] = row.value;
  }

  return record;
}

async function persistCategory(
  category: string,
  values: Record<string, unknown>,
  secretFields: ReadonlySet<string>,
): Promise<void> {
  const operations = Object.entries(values).flatMap(([field, rawValue]) => {
    const isSecret = secretFields.has(field);

    if (isSecret && (typeof rawValue !== "string" || rawValue.length === 0)) {
      return [];
    }

    const storedValue = (
      isSecret ? encryptSecret(rawValue as string) : rawValue
    ) as Prisma.InputJsonValue;
    const key = makeKey(category, field);

    return [
      prisma.appSetting.upsert({
        where: { key },
        update: { value: storedValue, category, isSecret },
        create: { key, category, value: storedValue, isSecret },
      }),
    ];
  });

  if (operations.length > 0) {
    await prisma.$transaction(operations);
  }
}

export const getOrganizationSettings = cache(
  async (): Promise<OrganizationSettings> => {
    const record = await readCategoryRecord("organization");
    return organizationSettingsSchema.parse(record);
  },
);

export async function updateOrganizationSettings(
  input: OrganizationSettings,
): Promise<void> {
  await persistCategory("organization", input, NO_SECRETS);
}

const EMAIL_SECRET_FIELDS: ReadonlySet<string> = new Set(["smtpPassword"]);

export type EmailSettingsView = Omit<EmailSettings, "smtpPassword"> & {
  smtpPasswordConfigured: boolean;
};

export async function getEmailSettings(): Promise<EmailSettingsView> {
  const record = await readCategoryRecord("email");
  const smtpPasswordConfigured =
    typeof record.smtpPassword === "string" && record.smtpPassword.length > 0;
  const parsed = emailSettingsSchema.parse({ ...record, smtpPassword: "" });

  return {
    smtpHost: parsed.smtpHost,
    smtpPort: parsed.smtpPort,
    smtpUser: parsed.smtpUser,
    fromAddress: parsed.fromAddress,
    fromName: parsed.fromName,
    smtpPasswordConfigured,
  };
}

export async function updateEmailSettings(input: EmailSettings): Promise<void> {
  await persistCategory("email", input, EMAIL_SECRET_FIELDS);
}

export async function getFileSettings(): Promise<FileSettings> {
  const record = await readCategoryRecord("files");
  return fileSettingsSchema.parse(record);
}

// A stored secret that can't be decrypted (almost always because
// APP_ENCRYPTION_KEY changed) must degrade gracefully — SSO/email stop working
// and it's logged — rather than throw and 500 every page that reads a secret.
function safeDecryptSecret(value: string, settingKey: string): string | null {
  try {
    return decryptSecret(value);
  } catch (error) {
    console.error(
      `[settings] failed to decrypt "${settingKey}" — has APP_ENCRYPTION_KEY changed? Re-save this secret to fix.`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function getEmailSecret(): Promise<string | null> {
  const key = "email.smtpPassword";
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row || typeof row.value !== "string" || row.value.length === 0) {
    return null;
  }
  return safeDecryptSecret(row.value, key);
}

export async function getSsoSecret(provider: string): Promise<string | null> {
  const key = `sso.${provider}ClientSecret`;
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row || typeof row.value !== "string" || row.value.length === 0) {
    return null;
  }
  return safeDecryptSecret(row.value, key);
}

const SSO_SECRET_FIELDS: ReadonlySet<string> = new Set([
  "entraIdClientSecret",
  "googleClientSecret",
  "oidcClientSecret",
]);

export async function persistSsoSecrets(input: {
  entraIdClientSecret?: string;
  googleClientSecret?: string;
  oidcClientSecret?: string;
}): Promise<void> {
  await persistCategory(
    "sso",
    input as Record<string, unknown>,
    SSO_SECRET_FIELDS,
  );
}

export async function getSsoSecretConfigured(): Promise<{
  entraId: boolean;
  google: boolean;
  oidc: boolean;
}> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: [
          "sso.entraIdClientSecret",
          "sso.googleClientSecret",
          "sso.oidcClientSecret",
        ],
      },
    },
    select: { key: true, value: true },
  });

  const result = { entraId: false, google: false, oidc: false };
  for (const row of rows) {
    const configured = typeof row.value === "string" && row.value.length > 0;
    if (row.key === "sso.entraIdClientSecret") result.entraId = configured;
    else if (row.key === "sso.googleClientSecret") result.google = configured;
    else if (row.key === "sso.oidcClientSecret") result.oidc = configured;
  }
  return result;
}

export async function getScoringSettings(): Promise<ScoringSettings> {
  const record = await readCategoryRecord("scoring");
  return scoringSettingsSchema.parse(record);
}

export async function updateScoringSettings(
  input: ScoringSettings,
): Promise<void> {
  await persistCategory(
    "scoring",
    input as unknown as Record<string, unknown>,
    NO_SECRETS,
  );
}

export async function getAssessmentSettings(): Promise<AssessmentSettings> {
  const record = await readCategoryRecord("assessments");
  return assessmentSettingsSchema.parse(record);
}

const EMAIL_TEMPLATE_CATEGORY = "email.template";

export async function getEmailTemplateSettings(): Promise<EmailTemplateSettings> {
  const record = await readCategoryRecord(EMAIL_TEMPLATE_CATEGORY);
  return emailTemplateSchema.parse(record);
}

export async function updateEmailTemplateFields(
  fields: Partial<Record<keyof EmailTemplateSettings, string>>,
): Promise<void> {
  await persistCategory(
    EMAIL_TEMPLATE_CATEGORY,
    fields as Record<string, unknown>,
    NO_SECRETS,
  );
}

const BREAK_GLASS_KEY = "sso.breakGlassHash";

export async function setBreakGlassHash(hash: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: BREAK_GLASS_KEY },
    update: { value: hash, category: "sso" },
    create: { key: BREAK_GLASS_KEY, category: "sso", value: hash },
  });
}

export async function getBreakGlassHash(): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({
    where: { key: BREAK_GLASS_KEY },
  });
  return row && typeof row.value === "string" && row.value.length > 0
    ? row.value
    : null;
}

export async function getSsoSettings(): Promise<SsoSettings> {
  const record = await readCategoryRecord("sso");
  return ssoSettingsSchema.parse(record);
}

export async function updateSsoSettings(input: SsoSettings): Promise<void> {
  await persistCategory(
    "sso",
    input as unknown as Record<string, unknown>,
    NO_SECRETS,
  );
}

export const getAppearanceSettings = cache(
  async (): Promise<AppearanceSettings> => {
    const record = await readCategoryRecord("appearance");
    return appearanceSettingsSchema.parse(record);
  },
);

export async function updateAppearanceSettings(
  input: AppearanceSettings,
): Promise<void> {
  await persistCategory(
    "appearance",
    input as unknown as Record<string, unknown>,
    NO_SECRETS,
  );
}

const STORAGE_SECRET_FIELDS: ReadonlySet<string> = new Set([
  "s3SecretAccessKey",
  "azureConnectionString",
]);

export const getStorageSettings = cache(async (): Promise<StorageSettings> => {
  const record = await readCategoryRecord("storage");
  const parsed = storageSettingsSchema.parse(record);

  if (parsed.s3SecretAccessKey) {
    parsed.s3SecretAccessKey =
      safeDecryptSecret(parsed.s3SecretAccessKey, "s3SecretAccessKey") ?? "";
  }
  if (parsed.azureConnectionString) {
    parsed.azureConnectionString =
      safeDecryptSecret(
        parsed.azureConnectionString,
        "azureConnectionString",
      ) ?? "";
  }

  return parsed;
});

export async function updateStorageSettings(
  input: StorageSettings,
): Promise<void> {
  await persistCategory(
    "storage",
    input as unknown as Record<string, unknown>,
    STORAGE_SECRET_FIELDS,
  );
}

export async function updateAssessmentSettings(
  input: AssessmentSettings,
): Promise<void> {
  await persistCategory(
    "assessments",
    input as unknown as Record<string, unknown>,
    NO_SECRETS,
  );
}

export async function updateFileSettings(input: FileSettings): Promise<void> {
  await persistCategory(
    "files",
    input as unknown as Record<string, unknown>,
    NO_SECRETS,
  );
}

export async function getAuditRetention(): Promise<number> {
  const row = await prisma.appSetting.findUnique({
    where: { key: "audit.retentionDays" },
  });
  return (row && typeof row.value === "number" ? row.value : 0) as number;
}

export async function updateAuditRetention(days: number): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: "audit.retentionDays" },
    update: { value: days },
    create: { key: "audit.retentionDays", category: "audit", value: days },
  });
}

export async function getEmailLogRetention(): Promise<number> {
  const row = await prisma.appSetting.findUnique({
    where: { key: "assessments.emailLogRetentionDays" },
  });
  return (row && typeof row.value === "number" ? row.value : 14) as number;
}

export async function updateEmailLogRetention(days: number): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: "assessments.emailLogRetentionDays" },
    update: { value: days },
    create: {
      key: "assessments.emailLogRetentionDays",
      category: "assessments",
      value: days,
    },
  });
}
