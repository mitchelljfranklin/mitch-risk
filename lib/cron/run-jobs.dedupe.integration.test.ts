import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { findSentNotificationKeys } from "@/lib/cron/run-jobs";

const PREFIX = "Dedupe regression";
const RECIPIENT = "reviewer@dedupe.test";

async function cleanup() {
  await prisma.notificationLog.deleteMany({
    where: { assessment: { vendor: { name: { startsWith: PREFIX } } } },
  });
  await prisma.vendor.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

let assessmentId: string;

beforeAll(async () => {
  const vendor = await prisma.vendor.create({
    data: { name: `${PREFIX} Vendor`, contactEmail: "vendor@dedupe.test" },
  });
  const assessment = await prisma.assessment.create({
    data: { vendorId: vendor.id, title: `${PREFIX} Assessment` },
  });
  assessmentId = assessment.id;
});

describe("findSentNotificationKeys (integration)", () => {
  it("suppresses a subject-less key even when the stored row has an email subject", async () => {
    await prisma.notificationLog.create({
      data: {
        assessmentId,
        type: "ESCALATION",
        sentTo: RECIPIENT,
        subject: "Overdue: Some Assessment — Some Vendor",
        status: "SENT",
      },
    });

    const sent = await findSentNotificationKeys([
      { assessmentId, type: "ESCALATION", sentTo: RECIPIENT, status: "SENT" },
    ]);

    expect(sent.size).toBe(1);
  });

  it("does not suppress when only a FAILED row exists", async () => {
    await prisma.notificationLog.create({
      data: {
        assessmentId,
        type: "REMINDER",
        sentTo: "other@dedupe.test",
        subject: "Reminder: Some Assessment",
        status: "FAILED",
      },
    });

    const sent = await findSentNotificationKeys([
      {
        assessmentId,
        type: "REMINDER",
        sentTo: "other@dedupe.test",
        status: "SENT",
      },
    ]);

    expect(sent.size).toBe(0);
  });

  it("matches expiry keys on their exact window tag and not other windows", async () => {
    await prisma.notificationLog.create({
      data: {
        assessmentId: null,
        type: "EXPIRY",
        sentTo: RECIPIENT,
        subject: `cert:${assessmentId}:2026-01-01:30d`,
        status: "SENT",
      },
    });

    const [matchingWindow, otherWindow] = await findSentNotificationKeys([
      {
        type: "EXPIRY",
        sentTo: RECIPIENT,
        subject: `cert:${assessmentId}:2026-01-01:30d`,
      },
      {
        type: "EXPIRY",
        sentTo: RECIPIENT,
        subject: `cert:${assessmentId}:2026-01-01:7d`,
      },
    ]);

    expect(matchingWindow).toBeDefined();
    expect(otherWindow).toBeUndefined();
  });
});
