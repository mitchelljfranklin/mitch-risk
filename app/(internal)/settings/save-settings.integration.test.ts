import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

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
import { saveLimitsSettings, saveSchedulingSettings } from "./actions";

function schedulingFormData(): FormData {
  const formData = new FormData();
  formData.set("reminderDays", "2");
  formData.set("escalationDays", "5");
  formData.set("defaultDueDays", "30");
  formData.set("internalSchedulerEnabled", "on");
  return formData;
}

function limitsFormData(): FormData {
  const formData = new FormData();
  formData.set("loginRateLimit", "8");
  formData.set("sessionTimeoutMinutes", "25");
  formData.set("auditRetention", "21");
  formData.set("emailLogRetention", "10");
  formData.set("maxUploadMb", "15");
  formData.append("allowedExtensions", "png");
  formData.append("allowedExtensions", "zip");
  formData.set("portalPageLoadsPerMin", "31");
  formData.set("portalUploadsPerMin", "11");
  formData.set("portalSubmitPerMin", "6");
  formData.set("portalCommentPerMin", "9");
  formData.set("portalPasswordAttemptsPerMin", "7");
  formData.set("passwordResetPerMin", "2");
  formData.set("breakGlassPerMin", "12");
  return formData;
}

beforeEach(async () => {
  await prisma.appSetting.deleteMany({});
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("settings save isolation (integration)", () => {
  it("saving scheduling leaves every limits-tab setting untouched", async () => {
    await updateAuditRetention(45);
    await updateFileSettings({
      maxUploadMb: 33,
      allowedExtensions: ["png", "docx"],
    });
    await updateAssessmentSettings({
      loginRateLimitPerMin: 33,
      sessionTimeoutMinutes: 55,
    });

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
    // Limits-owned values survive.
    expect(assessment.loginRateLimitPerMin).toBe(33);
    expect(assessment.sessionTimeoutMinutes).toBe(55);

    expect(await getAuditRetention()).toBe(45);
    const files = await getFileSettings();
    expect(files.maxUploadMb).toBe(33);
    expect(files.allowedExtensions).toEqual(["png", "docx"]);
  });

  it("saving limits leaves the scheduler toggle off when it was off", async () => {
    await updateCronSettings({ internalSchedulerEnabled: false });
    await updateAssessmentSettings({
      reminderOffsetDays: [9],
      escalationAfterDays: 6,
      defaultDueInDays: 40,
    });

    const result = await saveLimitsSettings(undefined, limitsFormData());

    expect(result?.ok).toBe(true);

    const cron = await getCronSettings();
    expect(cron.internalSchedulerEnabled).toBe(false);

    const assessment = await getAssessmentSettings();
    // Scheduling-owned values survive.
    expect(assessment.reminderOffsetDays).toEqual([9]);
    expect(assessment.escalationAfterDays).toBe(6);
    expect(assessment.defaultDueInDays).toBe(40);
    // Limits-owned values are applied.
    expect(assessment.loginRateLimitPerMin).toBe(8);
    expect(assessment.sessionTimeoutMinutes).toBe(25);
    expect(assessment.portalPageLoadsPerMin).toBe(31);
    expect(assessment.portalUploadsPerMin).toBe(11);
    expect(assessment.portalSubmitPerMin).toBe(6);
    expect(assessment.portalCommentPerMin).toBe(9);
    expect(assessment.portalPasswordAttemptsPerMin).toBe(7);
    expect(assessment.passwordResetPerMin).toBe(2);
    expect(assessment.breakGlassPerMin).toBe(12);

    expect(await getAuditRetention()).toBe(21);
    expect(await getEmailLogRetention()).toBe(10);
    const files = await getFileSettings();
    expect(files.maxUploadMb).toBe(15);
    expect(files.allowedExtensions).toEqual(["png", "zip"]);
  });
});
