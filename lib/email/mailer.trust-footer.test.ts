import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The footer decision lives in the mailer; these tests drive it end-to-end
// through sendEmail with the trust center settings flipped, so the invite
// call sites need no changes (current or future) to pick the footer up.

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appSetting: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
    },
    notificationLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

const sendMailMock = vi.fn().mockResolvedValue({});
const transporterMock = { sendMail: sendMailMock };

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
  },
}));

vi.mock("@/lib/env", () => ({
  env: { APP_URL: "https://trust.test" },
}));

// SMTP configured baseline; individual tests override per test.
const smtpSettings = {
  smtpHost: "smtp.test",
  smtpPort: 587,
  smtpUser: "",
  fromAddress: "from@test",
  fromName: "Test",
  smtpPasswordConfigured: false,
};

const templateSettings = {
  inviteSubject: "Invite: {{assessmentTitle}}",
  inviteBody: "Please complete {{assessmentTitle}}: {{portalUrl}}",
  invitePasswordSubject: "Invite: {{assessmentTitle}}",
  invitePasswordBody: "Password: {{portalPassword}}",
  reminderSubject: "Reminder",
  reminderBody: "Reminder body",
  escalationSubject: "Escalation",
  escalationBody: "Escalation body",
  submissionSubject: "Submission",
  submissionBody: "Submission body",
  clarificationSubject: "Clarification",
  clarificationBody: "Clarification body",
  resetSubject: "Reset",
  resetBody: "Reset body {{resetUrl}}",
  expirySubject: "Expiry",
  expiryBody: "Expiry body",
};

// Trust center settings mutated per test.
let trustCenterState = {
  enabled: true,
  intro: "",
  contactEmail: "",
  includeInInvites: true,
  pageLoadsPerMin: 30,
  downloadsPerMin: 30,
};

vi.mock("@/lib/settings", () => ({
  getEmailSettings: vi.fn(async () => smtpSettings),
  getEmailTemplateSettings: vi.fn(async () => templateSettings),
  getTrustCenterSettings: vi.fn(async () => trustCenterState),
  getEmailSecret: vi.fn(async () => null),
  getAuditRetention: vi.fn(async () => 0),
}));

import { sendEmail } from "@/lib/email/mailer";

describe("trust center invite footer (integration)", () => {
  beforeEach(() => {
    sendMailMock.mockClear();
    trustCenterState = {
      enabled: true,
      intro: "",
      contactEmail: "",
      includeInInvites: true,
      pageLoadsPerMin: 30,
      downloadsPerMin: 30,
    };
  });

  afterEach(() => {
    trustCenterState = {
      enabled: true,
      intro: "",
      contactEmail: "",
      includeInInvites: true,
      pageLoadsPerMin: 30,
      downloadsPerMin: 30,
    };
  });

  it("appends the trust center footer to invite emails when opted in", async () => {
    const result = await sendEmail("vendor@test", "invite", {
      assessmentTitle: "Annual review",
      portalUrl: "https://trust.test/portal/x",
    });

    expect(result.ok).toBe(true);
    const html = String(sendMailMock.mock.calls[0]?.[0]?.html ?? "");
    expect(html).toContain("https://trust.test/trust");
    expect(html).toContain("security posture");
  });

  it("does not include the footer when includeInInvites is off", async () => {
    trustCenterState = { ...trustCenterState, includeInInvites: false };

    await sendEmail("vendor@test", "invite", {
      assessmentTitle: "Annual",
      portalUrl: "https://trust.test/portal/x",
    });

    const html = String(sendMailMock.mock.calls[0]?.[0]?.html ?? "");
    expect(html).not.toContain("https://trust.test/trust");
  });

  it("does not include the footer when the trust center is disabled", async () => {
    trustCenterState = { ...trustCenterState, enabled: false };

    await sendEmail("vendor@test", "invite", {
      assessmentTitle: "Annual",
      portalUrl: "https://trust.test/portal/x",
    });

    const html = String(sendMailMock.mock.calls[0]?.[0]?.html ?? "");
    expect(html).not.toContain("https://trust.test/trust");
  });

  it("never adds the footer to non-invite template types", async () => {
    await sendEmail("vendor@test", "reminder", {
      assessmentTitle: "Annual",
      portalUrl: "https://trust.test/portal/x",
    });

    const html = String(sendMailMock.mock.calls[0]?.[0]?.html ?? "");
    expect(html).not.toContain("https://trust.test/trust");
  });
});
