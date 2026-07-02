import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAssessment,
  getAssessmentByToken,
  saveResponses,
  sendAssessment,
  submitAssessment,
} from "@/lib/db/assessments";
import {
  finalizeAssessment,
  markUnderReview,
  reopenReview,
  sendBackToVendor,
  setReviewDecision,
} from "@/lib/db/collaboration";
import {
  addQuestion,
  addSection,
  createTemplate,
  publishTemplate,
} from "@/lib/db/templates";
import { createVendor } from "@/lib/db/vendors";
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { prisma } from "@/lib/prisma";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { type QuestionInput } from "@/lib/schemas/template";

const VENDOR_NAME = "P18 Collab Vendor";
const TEMPLATE_NAME = "P18 Collab Template";

function buildQuestion(
  overrides: Partial<QuestionInput> & Pick<QuestionInput, "text" | "type">,
): QuestionInput {
  return {
    helpText: "",
    riskWeight: "MEDIUM",
    required: true,
    options: [],
    expectedAnswer: "",
    conditionQuestionId: "",
    conditionEquals: "",
    controlIds: [],
    ...overrides,
  };
}

async function getOrCreateReviewer(): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: { email: "p18-test-reviewer@example.test" },
  });
  if (existing) return existing.id;
  await ensureSystemRoles();
  const reviewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
  if (!reviewerRole) throw new Error("reviewer role not found");
  const created = await prisma.user.create({
    data: {
      email: "p18-test-reviewer@example.test",
      name: "Test Reviewer",
      passwordHash: "",
      roleId: reviewerRole.id,
    },
  });
  return created.id;
}

async function cleanup() {
  await prisma.vendor.deleteMany({ where: { name: VENDOR_NAME } });
  await prisma.vendor.deleteMany({ where: { name: VENDOR_NAME + " 2" } });
  await prisma.vendor.deleteMany({ where: { name: VENDOR_NAME + " 3" } });
  await prisma.template.deleteMany({ where: { name: TEMPLATE_NAME } });
  await prisma.template.deleteMany({ where: { name: TEMPLATE_NAME + " 2" } });
  await prisma.template.deleteMany({ where: { name: TEMPLATE_NAME + " 3" } });
  await prisma.user.deleteMany({
    where: { email: "p18-test-reviewer@example.test" },
  });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("collaboration finalize and reopen (integration)", () => {
  it("blocks finalize when answers are unreviewed", async () => {
    const template = await createTemplate({
      name: TEMPLATE_NAME,
      description: "",
    });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({ text: "Q1?", type: "YES_NO", expectedAnswer: "YES" }),
    );
    await addQuestion(
      section.id,
      buildQuestion({ text: "Q2?", type: "FREE_TEXT" }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: VENDOR_NAME,
      contactName: "",
      contactEmail: "collab@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "Collab assessment",
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

    const portal = await getAssessmentByToken(token);
    if (!portal) throw new Error("portal not found");

    for (const q of portal.questions) {
      await saveResponses(token, [
        {
          assessmentQuestionId: q.id,
          value: q.type === "YES_NO" ? "YES" : "text",
          isNotApplicable: false,
        },
      ]);
    }
    await submitAssessment(token);

    const result = await finalizeAssessment(assessment.id);
    expect(result.ok).toBe(false);
    expect(result.missing).toBeGreaterThan(0);
  });

  it("finalizes successfully when all answers are approved", async () => {
    const template = await createTemplate({
      name: TEMPLATE_NAME + " 2",
      description: "",
    });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({ text: "Q1?", type: "YES_NO", expectedAnswer: "YES" }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: VENDOR_NAME + " 2",
      contactName: "",
      contactEmail: "collab2@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "Collab assessment 2",
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

    const portal = await getAssessmentByToken(token);
    if (!portal) throw new Error("portal not found");

    const q = portal.questions[0];
    await saveResponses(token, [
      {
        assessmentQuestionId: q.id,
        value: "YES",
        isNotApplicable: false,
      },
    ]);
    await submitAssessment(token);

    const responses = await prisma.response.findMany({
      where: { assessmentId: assessment.id },
    });

    for (const response of responses) {
      const reviewerId = await getOrCreateReviewer();
      await setReviewDecision({
        responseId: response.id,
        reviewerId,
        decision: "APPROVED",
      });
    }

    const result = await finalizeAssessment(assessment.id);
    expect(result.ok).toBe(true);

    const updated = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
    });
    expect(updated.status).toBe("COMPLETED");

    await prisma.vendor.deleteMany({ where: { name: VENDOR_NAME + " 2" } });
    await prisma.template.deleteMany({
      where: { name: TEMPLATE_NAME + " 2" },
    });
  });

  it("send back to vendor and reopen review transition correctly", async () => {
    const template = await createTemplate({
      name: TEMPLATE_NAME + " 3",
      description: "",
    });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({ text: "Q1?", type: "YES_NO", expectedAnswer: "YES" }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: VENDOR_NAME + " 3",
      contactName: "",
      contactEmail: "collab3@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "Collab assessment 3",
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

    const portal = await getAssessmentByToken(token);
    if (!portal) throw new Error("portal not found");

    await saveResponses(token, [
      {
        assessmentQuestionId: portal.questions[0].id,
        value: "YES",
        isNotApplicable: false,
      },
    ]);
    await submitAssessment(token);

    // First review decision moves SUBMITTED -> UNDER_REVIEW.
    await markUnderReview(assessment.id);
    const underReview = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
    });
    expect(underReview.status).toBe("UNDER_REVIEW");

    const responses = await prisma.response.findMany({
      where: { assessmentId: assessment.id },
    });
    for (const response of responses) {
      const reviewerId = await getOrCreateReviewer();
      await setReviewDecision({
        responseId: response.id,
        reviewerId,
        decision: "APPROVED",
      });
    }
    await finalizeAssessment(assessment.id);

    // Reopen review returns COMPLETED -> UNDER_REVIEW without touching the portal.
    await reopenReview(assessment.id);
    const reopened = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
    });
    expect(reopened.status).toBe("UNDER_REVIEW");

    // Send back to vendor reopens the portal (IN_PROGRESS) and extends the token.
    await sendBackToVendor(assessment.id);
    const sentBack = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
    });
    expect(sentBack.status).toBe("IN_PROGRESS");
    expect(sentBack.tokenExpiresAt).not.toBeNull();

    await prisma.vendor.deleteMany({ where: { name: VENDOR_NAME + " 3" } });
    await prisma.template.deleteMany({
      where: { name: TEMPLATE_NAME + " 3" },
    });
  });
});
