import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAssessment,
  getAssessmentByToken,
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

const VENDOR = "P4 Findings Vendor";
const TEMPLATE = "P4 Findings Template";

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

async function cleanup() {
  await prisma.vendor.deleteMany({ where: { name: VENDOR } });
  await prisma.template.deleteMany({ where: { name: TEMPLATE } });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("scoring and findings (integration)", () => {
  it("generates findings for non-compliant answers and updates vendor score", async () => {
    const control = await prisma.control.findFirst();
    if (!control) {
      throw new Error("no controls seeded");
    }

    const template = await createTemplate({ name: TEMPLATE, description: "" });
    const section = await addSection(template.id, "Access");
    await addQuestion(
      section.id,
      buildQuestion({
        text: "Enforce MFA?",
        type: "YES_NO",
        riskWeight: "CRITICAL",
        expectedAnswer: "YES",
        controlIds: [control.id],
      }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: VENDOR,
      contactName: "",
      contactEmail: "p4@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "P4 Findings assessment",
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
    if (!token) {
      throw new Error("no token");
    }

    const portal = await getAssessmentByToken(token);
    const snapshotQuestion = portal?.questions[0];
    if (!snapshotQuestion) {
      throw new Error("no snapshot question");
    }

    await saveResponses(token, [
      {
        assessmentQuestionId: snapshotQuestion.id,
        value: "NO",
        isNotApplicable: false,
      },
    ]);

    const result = await submitAssessment(token);
    expect(result.ok).toBe(true);

    const findings = await prisma.finding.findMany({
      where: { assessmentId: assessment.id },
    });
    expect(findings.length).toBe(1);
    expect(findings[0].severity).toBe("CRITICAL");
    expect(findings[0].status).toBe("OPEN");
    expect(findings[0].controlCodes).toContain(control.code);
    expect(findings[0].title).toBe("Enforce MFA?");

    const scored = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
      select: { score: true },
    });
    expect(scored.score).toBe(0);

    const updatedVendor = await prisma.vendor.findUniqueOrThrow({
      where: { id: vendor.id },
    });
    expect(updatedVendor.overallScore).toBe(0);
  });
});
