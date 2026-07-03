import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAssessment,
  extendAssessmentToken,
  getAssessmentByToken,
  getAssessmentForToken,
  isPortalEditable,
  isTokenExpired,
  regenerateAssessmentToken,
  revokeAssessmentToken,
  saveResponses,
  sendAssessment,
  submitAssessment,
} from "@/lib/db/assessments";
import {
  addQuestion,
  addSection,
  createTemplate,
  publishTemplate,
} from "@/lib/db/templates";
import { createVendor } from "@/lib/db/vendors";
import { prisma } from "@/lib/prisma";
import { type QuestionInput } from "@/lib/schemas/template";

const VENDOR_NAME = "P18 Token Vendor";
const TEMPLATE_NAME = "P18 Token Template";

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
  await prisma.vendor.deleteMany({ where: { name: VENDOR_NAME } });
  await prisma.template.deleteMany({ where: { name: TEMPLATE_NAME } });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("portal token lifecycle (integration)", () => {
  async function createTokenizedAssessment() {
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
      contactEmail: "token@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "Token test",
      templateId: template.id,
      dueDate: "",
      reviewerId: "",
    });
    await sendAssessment(assessment.id);

    return assessment;
  }

  it("revoke invalidates the token immediately", async () => {
    const assessment = await createTokenizedAssessment();
    const sent = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
      select: { accessToken: true },
    });
    const token = sent.accessToken;
    if (!token) throw new Error("no token");

    expect(await getAssessmentByToken(token)).not.toBeNull();
    await revokeAssessmentToken(assessment.id);
    expect(await getAssessmentByToken(token)).toBeNull();
  });

  it("regenerate produces a new valid token and invalidates the old one", async () => {
    const assessment = await createTokenizedAssessment();
    const sent = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
      select: { accessToken: true },
    });
    const oldToken = sent.accessToken;
    if (!oldToken) throw new Error("no token");

    await regenerateAssessmentToken(assessment.id);
    const updated = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
      select: { accessToken: true },
    });
    const newToken = updated.accessToken;
    if (!newToken) throw new Error("no new token");

    expect(newToken).not.toBe(oldToken);
    expect(await getAssessmentByToken(oldToken)).toBeNull();
    expect(await getAssessmentByToken(newToken)).not.toBeNull();
  });

  it("extend keeps the same token and extends expiry", async () => {
    const assessment = await createTokenizedAssessment();
    const sent = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
      select: { accessToken: true, tokenExpiresAt: true },
    });
    const token = sent.accessToken;
    if (!token || !sent.tokenExpiresAt) throw new Error("no token");

    await extendAssessmentToken(assessment.id, 60);
    const updated = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
      select: { accessToken: true, tokenExpiresAt: true },
    });

    expect(updated.accessToken).toBe(token);
    if (!updated.tokenExpiresAt) throw new Error("no expiry");
    const diffDays =
      (updated.tokenExpiresAt.getTime() - sent.tokenExpiresAt.getTime()) /
      (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(30, 0);
  });

  it("expired token returns null", async () => {
    expect(isTokenExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isTokenExpired(new Date(Date.now() + 86_400_000))).toBe(false);
    expect(isTokenExpired(null)).toBe(false);
  });

  it("invalid token returns null", async () => {
    expect(
      await getAssessmentByToken("completely-fake-token-xyz-123"),
    ).toBeNull();
    expect(await getAssessmentForToken("another-fake-token")).toBeNull();
  });

  it("locks portal edits once submitted, even while the token is still valid", async () => {
    const assessment = await createTokenizedAssessment();
    const sent = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
      select: { accessToken: true },
    });
    const token = sent.accessToken;
    if (!token) throw new Error("no token");

    const question = await prisma.assessmentQuestion.findFirstOrThrow({
      where: { assessmentId: assessment.id },
      select: { id: true },
    });
    await saveResponses(token, [
      {
        assessmentQuestionId: question.id,
        value: "YES",
        isNotApplicable: false,
      },
    ]);
    await submitAssessment(token);

    const submitted = await getAssessmentForToken(token);
    expect(submitted).not.toBeNull();
    expect(submitted?.status).toBe("SUBMITTED");
    expect(isPortalEditable(submitted!.status, submitted!.tokenExpiresAt)).toBe(
      false,
    );
  });
});
