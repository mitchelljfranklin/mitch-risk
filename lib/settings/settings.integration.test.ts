import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Prisma } from "../../prisma/generated/prisma/client";

import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  getAppearanceSettings,
  getAssessmentSettings,
  getEmailSecret,
  getEmailSettings,
  getOrganizationSettings,
  getSsoSecret,
  getTrustCenterSettings,
  updateAppearanceSettings,
  updateAssessmentSettings,
  updateEmailSettings,
  updateOrganizationSettings,
  updateTrustCenterSettings,
} from "@/lib/settings";

// Categories this suite mutates. We snapshot them before and restore them
// after so the tests are non-destructive even if pointed at a populated
// database (the primary protection is a dedicated test DB — see vitest.setup).
const MUTATED_CATEGORIES = [
  "organization",
  "email",
  "appearance",
  "sso",
  "assessments",
  "trustcenter",
];

let settingsSnapshot: {
  key: string;
  category: string;
  value: Prisma.JsonValue;
  isSecret: boolean;
}[] = [];

async function snapshotSettings() {
  settingsSnapshot = await prisma.appSetting.findMany({
    where: { category: { in: MUTATED_CATEGORIES } },
    select: { key: true, category: true, value: true, isSecret: true },
  });
}

async function restoreSettings() {
  await prisma.appSetting.deleteMany({
    where: { category: { in: MUTATED_CATEGORIES } },
  });
  if (settingsSnapshot.length > 0) {
    await prisma.appSetting.createMany({
      data: settingsSnapshot.map((row) => ({
        key: row.key,
        category: row.category,
        value: row.value as Prisma.InputJsonValue,
        isSecret: row.isSecret,
      })),
    });
  }
}

beforeAll(async () => {
  await snapshotSettings();
  // Deterministic baseline for the assertions below.
  await prisma.appSetting.deleteMany({
    where: { category: { in: MUTATED_CATEGORIES } },
  });
  await updateOrganizationSettings({ name: "mitch-risk", supportEmail: "" });
});

afterAll(async () => {
  await restoreSettings();
  await prisma.$disconnect();
});

describe("settings persistence (integration)", () => {
  it("persists organization settings and reads them back", async () => {
    await updateOrganizationSettings({ name: "Acme Risk", supportEmail: "" });
    const organization = await getOrganizationSettings();
    expect(organization.name).toBe("Acme Risk");
  });

  it("stores the SMTP password encrypted at rest and redacts it on read", async () => {
    await updateEmailSettings({
      smtpHost: "smtp.example.test",
      smtpPort: 587,
      smtpUser: "mailer",
      fromAddress: "",
      fromName: "mitch-risk",
      smtpPassword: "s3cr3t-password",
    });

    const row = await prisma.appSetting.findUnique({
      where: { key: "email.smtpPassword" },
    });
    expect(row).not.toBeNull();
    expect(row?.isSecret).toBe(true);
    expect(typeof row?.value).toBe("string");
    expect(row?.value).not.toBe("s3cr3t-password");
    expect(decryptSecret(row?.value as string)).toBe("s3cr3t-password");

    const email = await getEmailSettings();
    expect(email.smtpHost).toBe("smtp.example.test");
    expect(email.smtpPasswordConfigured).toBe(true);
    expect(JSON.stringify(email)).not.toContain("s3cr3t-password");
  });

  it("keeps the existing secret when the password is left blank (write-only)", async () => {
    const before = await prisma.appSetting.findUnique({
      where: { key: "email.smtpPassword" },
    });

    await updateEmailSettings({
      smtpHost: "smtp.changed.test",
      smtpPort: 2525,
      smtpUser: "mailer",
      fromAddress: "",
      fromName: "mitch-risk",
      smtpPassword: "",
    });

    const after = await prisma.appSetting.findUnique({
      where: { key: "email.smtpPassword" },
    });
    expect(after?.value).toBe(before?.value);

    const email = await getEmailSettings();
    expect(email.smtpHost).toBe("smtp.changed.test");
    expect(email.smtpPasswordConfigured).toBe(true);
  });
});

describe("secret decryption failure degrades gracefully (integration)", () => {
  // Tamper a real payload's ciphertext so decryption fails its GCM auth check —
  // the same failure mode as a changed APP_ENCRYPTION_KEY.
  function tamperedPayload(): string {
    const parts = encryptSecret("original-secret").split(":");
    parts[2] = Buffer.from("a-different-plaintext-entirely").toString("base64");
    return parts.join(":");
  }

  it("returns null (not throw) when the SMTP secret can't be decrypted", async () => {
    await prisma.appSetting.upsert({
      where: { key: "email.smtpPassword" },
      update: { value: tamperedPayload() },
      create: {
        key: "email.smtpPassword",
        category: "email",
        value: tamperedPayload(),
        isSecret: true,
      },
    });

    await expect(getEmailSecret()).resolves.toBeNull();
  });

  it("returns null (not throw) when an SSO secret can't be decrypted", async () => {
    await prisma.appSetting.upsert({
      where: { key: "sso.entraIdClientSecret" },
      update: { value: tamperedPayload() },
      create: {
        key: "sso.entraIdClientSecret",
        category: "sso",
        value: tamperedPayload(),
        isSecret: true,
      },
    });

    await expect(getSsoSecret("entraId")).resolves.toBeNull();
  });
});

describe("configurable rate limits (integration)", () => {
  it("persists and reads back the portal/recovery rate limits", async () => {
    const current = await getAssessmentSettings();
    await updateAssessmentSettings({
      ...current,
      portalPageLoadsPerMin: 42,
      portalUploadsPerMin: 7,
      portalSubmitPerMin: 9,
      portalPasswordAttemptsPerMin: 3,
      passwordResetPerMin: 2,
      breakGlassPerMin: 20,
    });

    const saved = await getAssessmentSettings();
    expect(saved.portalPageLoadsPerMin).toBe(42);
    expect(saved.portalUploadsPerMin).toBe(7);
    expect(saved.portalSubmitPerMin).toBe(9);
    expect(saved.portalPasswordAttemptsPerMin).toBe(3);
    expect(saved.passwordResetPerMin).toBe(2);
    expect(saved.breakGlassPerMin).toBe(20);
  });

  it("falls back to defaults when the rate limits are unset", async () => {
    await prisma.appSetting.deleteMany({
      where: { key: { startsWith: "assessments." } },
    });
    const defaults = await getAssessmentSettings();
    expect(defaults.portalPageLoadsPerMin).toBe(30);
    expect(defaults.passwordResetPerMin).toBe(1);
    expect(defaults.breakGlassPerMin).toBe(10);
  });
});

describe("appearance settings persistence (integration)", () => {
  it("persists and reads back appearance settings", async () => {
    await updateAppearanceSettings({
      primaryHex: "#3b82f6",
      secondaryHex: "#f59e0b",
      logoKey: "test-logo-key",
      ragGreenHex: "",
      ragAmberHex: "",
      ragRedHex: "",
      ragUnscoredHex: "",
      borderRadius: 10,
      pageWidth: "constrained",
    });

    const appearance = await getAppearanceSettings();
    expect(appearance.primaryHex).toBe("#3b82f6");
    expect(appearance.secondaryHex).toBe("#f59e0b");
    expect(appearance.logoKey).toBe("test-logo-key");
  });

  it("returns empty defaults when appearance is not configured", async () => {
    await updateAppearanceSettings({
      primaryHex: "",
      secondaryHex: "",
      logoKey: "",
      ragGreenHex: "",
      ragAmberHex: "",
      ragRedHex: "",
      ragUnscoredHex: "",
      borderRadius: 10,
      pageWidth: "constrained",
    });

    const appearance = await getAppearanceSettings();
    expect(appearance.primaryHex).toBe("");
    expect(appearance.secondaryHex).toBe("");
    expect(appearance.logoKey).toBe("");
  });
});

describe("trust center settings persistence (integration)", () => {
  it("persists and reads back trust center settings", async () => {
    await updateTrustCenterSettings({
      enabled: true,
      intro: "Our security commitment",
      contactEmail: "security@example.test",
      includeInInvites: true,
    });

    const saved = await getTrustCenterSettings();
    expect(saved.enabled).toBe(true);
    expect(saved.intro).toBe("Our security commitment");
    expect(saved.contactEmail).toBe("security@example.test");
    expect(saved.includeInInvites).toBe(true);
  });

  it("self-heals to defaults when trust center settings are unset", async () => {
    await prisma.appSetting.deleteMany({
      where: { key: { startsWith: "trustcenter." } },
    });

    const defaults = await getTrustCenterSettings();
    expect(defaults.enabled).toBe(false);
    expect(defaults.intro).toBe("");
    expect(defaults.contactEmail).toBe("");
    expect(defaults.includeInInvites).toBe(false);
  });
});
