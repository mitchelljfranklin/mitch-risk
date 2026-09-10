import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAssessment,
  getAssessmentByToken,
  saveResponses,
  sendAssessment,
  submitAssessment,
} from "@/lib/db/assessments";
import {
  getVendorDomainRadar,
  getVendorHeatmap,
  getVendorProfile,
} from "@/lib/db/compliance";
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

    expect(profile.frameworkCompliance.length).toBeGreaterThanOrEqual(1);
    const isoCompliance = profile.frameworkCompliance.find(
      (framework) => framework.frameworkName === "ISO 27001",
    );
    expect(isoCompliance).toBeDefined();
    if (!isoCompliance) throw new Error("ISO framework compliance missing");
    expect(isoCompliance.mappedControlCount).toBeGreaterThanOrEqual(2);
    expect(isoCompliance.domains.length).toBeGreaterThanOrEqual(1);

    for (const entry of profile.domainBreakdown) {
      expect(entry.frameworkId).toBeTruthy();
      expect(entry.frameworkName).toBeTruthy();
    }

    // Exact lockout: both seeded ISO controls share one domain, Q1 answers
    // YES (compliant) and Q2 NO (not), both weighted MEDIUM -> one entry at
    // exactly half compliance with both controls counted.
    expect(profile.domainBreakdown.length).toBe(1);
    const domainEntry = profile.domainBreakdown[0]!;
    expect(domainEntry.frameworkName).toBe("ISO 27001");
    expect(domainEntry.controlCount).toBe(2);
    expect(domainEntry.complianceRatio).toBeCloseTo(0.5, 4);
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

describe("domain compliance radar (integration)", () => {
  async function submitMappedAssessment(
    vendorId: string,
    templateId: string,
    answer: string,
  ) {
    const assessment = await createAssessment(vendorId, {
      title: "Radar test",
      templateId,
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

    const question = portal.questions[0];
    if (!question) throw new Error("no questions");

    await saveResponses(token, [
      {
        assessmentQuestionId: question.id,
        value: answer,
        isNotApplicable: false,
      },
    ]);
    await submitAssessment(token);
  }

  it("returns a single series when only one assessment exists", async () => {
    const control = await prisma.control.findFirst({
      where: { framework: { name: "ISO 27001" } },
    });
    if (!control) throw new Error("no control seeded");

    const template = await createTemplate({
      name: TEMPLATE_NAME + " Radar 1",
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
      name: VENDOR_NAME + " Radar 1",
      contactName: "",
      contactEmail: "radar1@example.test",
      tier: "",
      website: "",
      notes: "",
    });

    await submitMappedAssessment(vendor.id, template.id, "YES");

    const radar = await getVendorDomainRadar(vendor.id, control.frameworkId);

    expect(radar.hasPrevious).toBe(false);
    expect(radar.domains.length).toBeGreaterThan(0);
    for (const domain of radar.domains) {
      expect(domain.previous).toBeNull();
      expect(domain.current).toBe(100);
    }

    await prisma.vendor.deleteMany({
      where: { name: VENDOR_NAME + " Radar 1" },
    });
    await prisma.template.deleteMany({
      where: { name: TEMPLATE_NAME + " Radar 1" },
    });
  });

  it("returns current vs previous when two assessments exist", async () => {
    const control = await prisma.control.findFirst({
      where: { framework: { name: "ISO 27001" } },
    });
    if (!control) throw new Error("no control seeded");

    const template = await createTemplate({
      name: TEMPLATE_NAME + " Radar 2",
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
      name: VENDOR_NAME + " Radar 2",
      contactName: "",
      contactEmail: "radar2@example.test",
      tier: "",
      website: "",
      notes: "",
    });

    await submitMappedAssessment(vendor.id, template.id, "NO");
    await submitMappedAssessment(vendor.id, template.id, "YES");

    const radar = await getVendorDomainRadar(vendor.id, control.frameworkId);

    expect(radar.hasPrevious).toBe(true);
    expect(radar.domains.length).toBeGreaterThan(0);
    for (const domain of radar.domains) {
      expect(domain.current).toBe(100);
      expect(domain.previous).toBe(0);
    }

    await prisma.vendor.deleteMany({
      where: { name: VENDOR_NAME + " Radar 2" },
    });
    await prisma.template.deleteMany({
      where: { name: TEMPLATE_NAME + " Radar 2" },
    });
  });

  it("returns empty domains when no questions map to the framework", async () => {
    const framework = await prisma.framework.findFirst({
      where: { name: "Essential Eight" },
    });
    if (!framework) throw new Error("no framework seeded");

    const control = await prisma.control.findFirst({
      where: { framework: { name: "ISO 27001" } },
    });
    if (!control) throw new Error("no control seeded");

    const template = await createTemplate({
      name: TEMPLATE_NAME + " Radar 3",
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
      name: VENDOR_NAME + " Radar 3",
      contactName: "",
      contactEmail: "radar3@example.test",
      tier: "",
      website: "",
      notes: "",
    });

    await submitMappedAssessment(vendor.id, template.id, "YES");

    const radar = await getVendorDomainRadar(vendor.id, framework.id);

    expect(radar.domains).toEqual([]);
    expect(radar.hasPrevious).toBe(false);

    await prisma.vendor.deleteMany({
      where: { name: VENDOR_NAME + " Radar 3" },
    });
    await prisma.template.deleteMany({
      where: { name: TEMPLATE_NAME + " Radar 3" },
    });
  });
});
