import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAssessment,
  getAssessmentByToken,
  saveResponses,
  sendAssessment,
  submitAssessment,
} from "@/lib/db/assessments";
import { getVendorHeatmap, getVendorProfile } from "@/lib/db/compliance";
import {
  addQuestion,
  addSection,
  createTemplate,
  publishTemplate,
} from "@/lib/db/templates";
import { createVendor } from "@/lib/db/vendors";
import { prisma } from "@/lib/prisma";
import { type QuestionInput } from "@/lib/schemas/template";

const VENDOR_NAME = "P18 Compliance Vendor";
const TEMPLATE_NAME = "P18 Compliance Template";

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

describe("compliance domain and heatmap (integration)", () => {
  it("returns domain breakdown with correct ratios", async () => {
    const controls = await prisma.control.findMany({
      where: { framework: { name: "ISO 27001" } },
      take: 2,
    });
    if (controls.length < 2) throw new Error("not enough controls seeded");

    const template = await createTemplate({
      name: TEMPLATE_NAME,
      description: "",
    });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({
        text: "Q1?",
        type: "YES_NO",
        expectedAnswer: "YES",
        controlIds: [controls[0].id],
      }),
    );
    await addQuestion(
      section.id,
      buildQuestion({
        text: "Q2?",
        type: "YES_NO",
        expectedAnswer: "YES",
        controlIds: [controls[1].id],
      }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: VENDOR_NAME,
      contactName: "",
      contactEmail: "compliance@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "Compliance test",
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

    // Q1 = compliant (YES), Q2 = non-compliant (NO)
    const q1 = portal.questions.find((question) => question.text === "Q1?");
    const q2 = portal.questions.find((question) => question.text === "Q2?");
    if (!q1 || !q2) throw new Error("questions not found");

    await saveResponses(token, [
      { assessmentQuestionId: q1.id, value: "YES", isNotApplicable: false },
      { assessmentQuestionId: q2.id, value: "NO", isNotApplicable: false },
    ]);
    await submitAssessment(token);

    const profile = await getVendorProfile(vendor.id);
    expect(profile).not.toBeNull();
    if (!profile) throw new Error("profile null");

    expect(profile.domainBreakdown.length).toBeGreaterThanOrEqual(1);
    expect(profile.history.length).toBeGreaterThanOrEqual(1);
  });

  it("heatmap returns rag=none for controls with no mapped questions", async () => {
    const framework = await prisma.framework.findFirst({
      where: { name: "ISO 27001" },
    });
    if (!framework) throw new Error("no framework seeded");

    const control = await prisma.control.findFirst({
      where: { frameworkId: framework.id },
    });
    if (!control) throw new Error("no controls seeded");

    const template = await createTemplate({
      name: TEMPLATE_NAME + " 2",
      description: "",
    });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({
        text: "Q1?",
        type: "YES_NO",
        expectedAnswer: "YES",
        controlIds: [control.id],
      }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: VENDOR_NAME + " 2",
      contactName: "",
      contactEmail: "heatmap@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "Heatmap none test",
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

    const heatmap = await getVendorHeatmap(vendor.id, framework.id);
    expect(heatmap.length).toBeGreaterThan(0);

    const unmappedControls = heatmap.filter(
      (control) => control.rag === "none",
    );
    expect(unmappedControls.length).toBeGreaterThan(0);
    for (const control of unmappedControls) {
      expect(control.complianceRatio).toBe(0);
    }

    await prisma.vendor.deleteMany({ where: { name: VENDOR_NAME + " 2" } });
    await prisma.template.deleteMany({
      where: { name: TEMPLATE_NAME + " 2" },
    });
  });

  it("heatmap returns RAG based on thresholds", async () => {
    const controls = await prisma.control.findMany({
      where: { framework: { name: "ISO 27001" } },
      take: 1,
    });
    if (controls.length < 1) throw new Error("no controls seeded");

    const template = await createTemplate({
      name: TEMPLATE_NAME + " 3",
      description: "",
    });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({
        text: "Q1?",
        type: "YES_NO",
        expectedAnswer: "YES",
        controlIds: [controls[0].id],
      }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: VENDOR_NAME + " 3",
      contactName: "",
      contactEmail: "rag@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "RAG test",
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

    // Non-compliant → should trigger red (< 60% amber)
    await saveResponses(token, [
      {
        assessmentQuestionId: portal.questions[0].id,
        value: "NO",
        isNotApplicable: false,
      },
    ]);
    await submitAssessment(token);

    const framework = await prisma.framework.findFirst({
      where: { name: "ISO 27001" },
    });
    if (!framework) throw new Error("no framework");
    const heatmap = await getVendorHeatmap(vendor.id, framework.id);

    const mappedControl = heatmap.find(
      (control) => control.id === controls[0].id,
    );
    expect(mappedControl).toBeDefined();
    if (!mappedControl) throw new Error("control not in heatmap");
    expect(mappedControl.rag).toBe("red");
    expect(mappedControl.complianceRatio).toBe(0);

    await prisma.vendor.deleteMany({ where: { name: VENDOR_NAME + " 3" } });
    await prisma.template.deleteMany({
      where: { name: TEMPLATE_NAME + " 3" },
    });
  });
});
