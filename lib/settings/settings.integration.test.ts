import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  getAppearanceSettings,
  getEmailSettings,
  getOrganizationSettings,
  updateAppearanceSettings,
  updateEmailSettings,
  updateOrganizationSettings,
} from "@/lib/settings";

async function resetState() {
  await prisma.appSetting.deleteMany({ where: { category: "email" } });
  await updateOrganizationSettings({ name: "mitch-risk", supportEmail: "" });
}

beforeAll(resetState);

afterAll(async () => {
  await resetState();
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
