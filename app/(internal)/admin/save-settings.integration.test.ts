import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

import { prisma } from "@/lib/prisma";
import {
  getAssessmentSettings,
  getAuditRetention,
  getCronSettings,
  getEmailLogRetention,
  getFileSettings,
  updateAssessmentSettings,
  updateAuditRetention,
  updateCronSettings,
  updateFileSettings,
} from "@/lib/settings";
import {
  saveAuditRetentionSettings,
  saveEmailLogRetentionSettings,
  saveRateLimitSettings,
  saveSchedulingSettings,
  saveSignInSecuritySettings,
  saveUploadSettings,
} from "./actions";

// Snapshot the whole settings table once and restore it before every test.
// This suite must be safe to point at ANY database (including a populated
// dev instance): a bare deleteMany({}) here previously wiped live SMTP,
// branding, scoring and storage config when tests ran against dev.
type AppSettingSnapshot = {
  id: string;
  category: string;
  key: string;
  value: unknown;
  isSecret: boolean;
};

let settingsSnapshot: AppSettingSnapshot[] = [];

async function restoreSettingsFromSnapshot(): Promise<void> {
  await prisma.$transaction([
    prisma.appSetting.deleteMany({}),
    prisma.appSetting.createMany({
      data: settingsSnapshot.map((setting) => ({
        id: setting.id,
        category: setting.category,
        key: setting.key,
        // Json columns reject undefined; the snapshot only holds real values.
        value: setting.value as never,
        isSecret: setting.isSecret,
      })),
    }),
  ]);
}

beforeAll(async () => {
  settingsSnapshot = await prisma.appSetting.findMany({
    select: {
      id: true,
      category: true,
      key: true,
      value: true,
      isSecret: true,
    },
  });
});

beforeEach(async () => {
  await restoreSettingsFromSnapshot();
});

afterAll(async () => {
  await restoreSettingsFromSnapshot();
  await prisma.$disconnect();
});

function schedulingFormData(): FormData {
  const formData = new FormData();
  formData.set("reminderDays", "2");
  formData.set("escalationDays", "5");
  formData.set("defaultDueDays", "30");
  formData.set("internalSchedulerEnabled", "on");
  return formData;
}

function signInSecurityFormData(): FormData {
  const formData = new FormData();
  formData.set("loginRateLimit", "8");
  formData.set("sessionTimeoutMinutes", "25");
  return formData;
}

function rateLimitsFormData(): FormData {
  const formData = new FormData();
  formData.set("portalPageLoadsPerMin", "31");
  formData.set("portalUploadsPerMin", "11");
  formData.set("portalSubmitPerMin", "6");
  formData.set("portalCommentPerMin", "9");
  formData.set("portalPasswordAttemptsPerMin", "7");
  formData.set("passwordResetPerMin", "2");
  formData.set("breakGlassPerMin", "12");
  return formData;
}

function uploadsFormData(): FormData {
  const formData = new FormData();
  formData.set("maxUploadMb", "15");
  formData.append("allowedExtensions", "png");
  formData.append("allowedExtensions", "zip");
  return formData;
}

function auditRetentionFormData(): FormData {
  const formData = new FormData();
  formData.set("auditRetention", "21");
  return formData;
}

function emailLogRetentionFormData(): FormData {
  const formData = new FormData();
  formData.set("emailLogRetention", "10");
  return formData;
}

// Seed every split-action-owned value with a distinctive baseline so each
// test can prove its action touches ONLY its own fields.
async function seedDistinctiveBaselines(): Promise<void> {
  await updateAuditRetention(45);
  await updateFileSettings({
    maxUploadMb: 33,
    allowedExtensions: ["png", "docx"],
  });
  await updateAssessmentSettings({
    loginRateLimitPerMin: 33,
    sessionTimeoutMinutes: 55,
    emailLogRetentionDays: 18,
    portalPageLoadsPerMin: 41,
    portalUploadsPerMin: 42,
    portalSubmitPerMin: 43,
    portalCommentPerMin: 44,
    portalPasswordAttemptsPerMin: 45,
    passwordResetPerMin: 46,
    breakGlassPerMin: 47,
    reminderOffsetDays: [9],
    escalationAfterDays: 6,
    defaultDueInDays: 40,
  });
  await updateCronSettings({ internalSchedulerEnabled: false });
}

describe("settings save isolation (integration)", () => {
  it("saving scheduling leaves every other admin setting untouched", async () => {
    await seedDistinctiveBaselines();

    const result = await saveSchedulingSettings(
      undefined,
      schedulingFormData(),
    );

    expect(result?.ok).toBe(true);

    const cron = await getCronSettings();
    expect(cron.internalSchedulerEnabled).toBe(true);

    const assessment = await getAssessmentSettings();
    expect(assessment.reminderOffsetDays).toEqual([2]);
    expect(assessment.escalationAfterDays).toBe(5);
    expect(assessment.defaultDueInDays).toBe(30);
    // Other owners' values survive.
    expect(assessment.loginRateLimitPerMin).toBe(33);
    expect(assessment.sessionTimeoutMinutes).toBe(55);
    expect(assessment.emailLogRetentionDays).toBe(18);
    expect(assessment.portalPageLoadsPerMin).toBe(41);
    expect(assessment.passwordResetPerMin).toBe(46);
    expect(assessment.breakGlassPerMin).toBe(47);

    expect(await getAuditRetention()).toBe(45);
    const files = await getFileSettings();
    expect(files.maxUploadMb).toBe(33);
    expect(files.allowedExtensions).toEqual(["png", "docx"]);
  });

  it("saving sign-in security touches only its two fields", async () => {
    await seedDistinctiveBaselines();

    const result = await saveSignInSecuritySettings(
      undefined,
      signInSecurityFormData(),
    );

    expect(result?.ok).toBe(true);

    const assessment = await getAssessmentSettings();
    expect(assessment.loginRateLimitPerMin).toBe(8);
    expect(assessment.sessionTimeoutMinutes).toBe(25);
    // Everything else survives.
    expect(assessment.emailLogRetentionDays).toBe(18);
    expect(assessment.portalPageLoadsPerMin).toBe(41);
    expect(assessment.passwordResetPerMin).toBe(46);
    expect(assessment.reminderOffsetDays).toEqual([9]);
    expect(assessment.escalationAfterDays).toBe(6);
    expect(assessment.defaultDueInDays).toBe(40);
    expect(await getAuditRetention()).toBe(45);
    expect(await getEmailLogRetention()).toBe(18);
    const files = await getFileSettings();
    expect(files.maxUploadMb).toBe(33);
  });

  it("saving rate limits touches only the portal/recovery fields", async () => {
    await seedDistinctiveBaselines();

    const result = await saveRateLimitSettings(undefined, rateLimitsFormData());

    expect(result?.ok).toBe(true);

    const assessment = await getAssessmentSettings();
    expect(assessment.portalPageLoadsPerMin).toBe(31);
    expect(assessment.portalUploadsPerMin).toBe(11);
    expect(assessment.portalSubmitPerMin).toBe(6);
    expect(assessment.portalCommentPerMin).toBe(9);
    expect(assessment.portalPasswordAttemptsPerMin).toBe(7);
    expect(assessment.passwordResetPerMin).toBe(2);
    expect(assessment.breakGlassPerMin).toBe(12);
    // Everything else survives.
    expect(assessment.loginRateLimitPerMin).toBe(33);
    expect(assessment.sessionTimeoutMinutes).toBe(55);
    expect(assessment.emailLogRetentionDays).toBe(18);
    expect(assessment.reminderOffsetDays).toEqual([9]);
    expect(await getAuditRetention()).toBe(45);
    const files = await getFileSettings();
    expect(files.maxUploadMb).toBe(33);
  });

  it("saving upload constraints touches only the file settings", async () => {
    await seedDistinctiveBaselines();

    const result = await saveUploadSettings(undefined, uploadsFormData());

    expect(result?.ok).toBe(true);

    const files = await getFileSettings();
    expect(files.maxUploadMb).toBe(15);
    expect(files.allowedExtensions).toEqual(["png", "zip"]);

    const assessment = await getAssessmentSettings();
    expect(assessment.loginRateLimitPerMin).toBe(33);
    expect(assessment.sessionTimeoutMinutes).toBe(55);
    expect(assessment.portalPageLoadsPerMin).toBe(41);
    expect(await getAuditRetention()).toBe(45);
    expect(await getEmailLogRetention()).toBe(18);
  });

  it("saving audit retention touches only the audit retention", async () => {
    await seedDistinctiveBaselines();

    const result = await saveAuditRetentionSettings(
      undefined,
      auditRetentionFormData(),
    );

    expect(result?.ok).toBe(true);
    expect(await getAuditRetention()).toBe(21);

    const assessment = await getAssessmentSettings();
    expect(assessment.loginRateLimitPerMin).toBe(33);
    expect(assessment.emailLogRetentionDays).toBe(18);
    expect(assessment.portalPageLoadsPerMin).toBe(41);
    const files = await getFileSettings();
    expect(files.maxUploadMb).toBe(33);
  });

  it("saving email log retention touches only the email log retention", async () => {
    await seedDistinctiveBaselines();

    const result = await saveEmailLogRetentionSettings(
      undefined,
      emailLogRetentionFormData(),
    );

    expect(result?.ok).toBe(true);
    expect(await getEmailLogRetention()).toBe(10);

    const assessment = await getAssessmentSettings();
    expect(assessment.loginRateLimitPerMin).toBe(33);
    expect(assessment.sessionTimeoutMinutes).toBe(55);
    expect(assessment.portalPageLoadsPerMin).toBe(41);
    expect(await getAuditRetention()).toBe(45);
  });
});
