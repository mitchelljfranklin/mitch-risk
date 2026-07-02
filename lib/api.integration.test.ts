import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAssessment,
  getAssessmentByToken,
  saveResponses,
  sendAssessment,
  submitAssessment,
} from "@/lib/db/assessments";
import { getVendorProfile } from "@/lib/db/compliance";
import {
  addQuestion,
  addSection,
  createTemplate,
  publishTemplate,
} from "@/lib/db/templates";
import { createVendor, getVendor } from "@/lib/db/vendors";
import { prisma } from "@/lib/prisma";
import { type QuestionInput } from "@/lib/schemas/template";

const VENDOR_NAME = "P18 API Vendor";
const TEMPLATE_NAME = "P18 API Template";

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

describe("API score data layer", () => {
  it("getVendor returns null for unknown vendor", async () => {
    const vendor = await getVendor("nonexistent-id-12345");
    expect(vendor).toBeNull();
  });

  it("getVendor returns correct shape for valid vendor", async () => {
    const vendor = await createVendor({
      name: VENDOR_NAME,
      contactName: "Contact",
      contactEmail: "api@example.test",
      tier: "MEDIUM",
      website: "https://example.com",
      notes: "",
    });

    const fetched = await getVendor(vendor.id);
    expect(fetched).not.toBeNull();
    if (!fetched) throw new Error("vendor not found");
    expect(fetched.name).toBe(VENDOR_NAME);
    expect(fetched.tier).toBe("MEDIUM");
    expect(fetched.overallScore).toBeNull();
    expect(fetched.lastAssessedAt).toBeNull();
  });

  it("getVendorProfile returns history after assessment", async () => {
    const vendor = await createVendor({
      name: VENDOR_NAME + " 2",
      contactName: "",
      contactEmail: "api2@example.test",
      tier: "",
      website: "",
      notes: "",
    });

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

    const assessment = await createAssessment(vendor.id, {
      title: "API test assessment",
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

    const profile = await getVendorProfile(vendor.id);
    expect(profile).not.toBeNull();
    if (!profile) throw new Error("profile null");
    expect(profile.history.length).toBeGreaterThanOrEqual(1);

    await prisma.vendor.deleteMany({ where: { name: VENDOR_NAME + " 2" } });
  });
});
