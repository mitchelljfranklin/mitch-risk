import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { getNotificationCounts } from "@/lib/db/notifications";

const VENDOR_NAME = "P27 Notif Vendor";
const TEMPLATE_NAME = "P27 Notif Template";

import { createAssessment, sendAssessment } from "@/lib/db/assessments";
import {
  addQuestion,
  addSection,
  createTemplate,
  publishTemplate,
} from "@/lib/db/templates";
import { createVendor } from "@/lib/db/vendors";
import { type QuestionInput } from "@/lib/schemas/template";

function buildQuestion(
  overrides: Partial<QuestionInput> & Pick<QuestionInput, "text" | "type">,
): QuestionInput {
  return {
    helpText: "",
    riskWeight: "MEDIUM",
    required: true,
    options: [],
    expectedAnswer: "",
    conditionalLogic: { match: "all", rules: [] },
    controlIds: [],
    ...overrides,
  };
}

async function cleanup() {
  await prisma.notificationLog.deleteMany();
  await prisma.vendor.deleteMany({ where: { name: VENDOR_NAME } });
  await prisma.template.deleteMany({ where: { name: TEMPLATE_NAME } });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe.sequential("notification counts (integration)", () => {
  it("returns non-negative counts whose total is the sum of its parts", async () => {
    const counts = await getNotificationCounts("any-user-id");
    expect(counts.unreviewedSubmissions).toBeGreaterThanOrEqual(0);
    expect(counts.overdueAssessments).toBeGreaterThanOrEqual(0);
    expect(counts.rejectedAwaitingVendor).toBeGreaterThanOrEqual(0);
    expect(counts.failedEmails).toBeGreaterThanOrEqual(0);
    expect(counts.total).toBe(
      counts.unreviewedSubmissions +
        counts.overdueAssessments +
        counts.rejectedAwaitingVendor +
        counts.failedEmails,
    );
  });

  it("counts unreviewed submissions", async () => {
    const template = await createTemplate({
      name: TEMPLATE_NAME,
      description: "",
    });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({ text: "Q1?", type: "YES_NO", expectedAnswer: "YES" }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: VENDOR_NAME,
      contactName: "",
      contactEmail: "notif@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "Notif test",
      templateId: template.id,
      dueDate: "",
      reviewerId: "",
    });
    await sendAssessment(assessment.id);

    const sent = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
      select: { accessToken: true },
    });
    const token = sent.accessToken;
    if (!token) throw new Error("no token");

    const portal = await prisma.assessment.findUnique({
      where: { accessToken: token },
      include: { questions: true },
    });
    if (!portal) throw new Error("portal not found");

    await prisma.response.create({
      data: {
        assessmentId: assessment.id,
        assessmentQuestionId: portal.questions[0].id,
        value: "YES",
      },
    });
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });

    const counts = await getNotificationCounts("any-user-id");
    expect(counts.unreviewedSubmissions).toBeGreaterThanOrEqual(1);
  });
});
