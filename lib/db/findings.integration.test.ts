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
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { createUser } from "@/lib/db/users";
import { updateFindingStatus } from "@/lib/db/findings";
import { scoreAssessment } from "@/lib/db/scoring";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { type QuestionInput } from "@/lib/schemas/template";

const VENDOR = "P53 Findings Vendor";
const TEMPLATE = "P53 Findings Template";
const REVIEWER_EMAIL = "p53-findings-reviewer@example.test";

function buildQuestion(
  overrides: Partial<QuestionInput> & Pick<QuestionInput, "text" | "type">,
): QuestionInput {
  return {
    helpText: "",
    riskWeight: "HIGH",
    required: true,
    options: [],
    expectedAnswer: "",
    conditionalLogic: { match: "all", rules: [] },
    controlIds: [],
    ...overrides,
  };
}

async function cleanup() {
  await prisma.vendor.deleteMany({ where: { name: VENDOR } });
  await prisma.template.deleteMany({ where: { name: TEMPLATE } });
  await prisma.user.deleteMany({ where: { email: REVIEWER_EMAIL } });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("finding status workflow (integration)", () => {
  it("preserves a reviewer-set status across a rescore", async () => {
    const template = await createTemplate({ name: TEMPLATE, description: "" });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({
        text: "Do you enforce MFA?",
        type: "YES_NO",
        expectedAnswer: "YES",
      }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: VENDOR,
      contactName: "",
      contactEmail: "p53@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "P53 assessment",
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

    // Answer non-compliant (expected YES) so scoring generates a finding.
    await saveResponses(token, [
      {
        assessmentQuestionId: portal.questions[0].id,
        value: "NO",
        isNotApplicable: false,
      },
    ]);
    await submitAssessment(token);

    const finding = await prisma.finding.findFirstOrThrow({
      where: { assessmentId: assessment.id },
    });
    expect(finding.status).toBe("OPEN");

    await ensureSystemRoles();
    const reviewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
    if (!reviewerRole) throw new Error("reviewer role missing");
    const reviewer = await createUser({
      name: "P53 Reviewer",
      email: REVIEWER_EMAIL,
      password: "correct-horse-battery-staple",
      roleId: reviewerRole.id,
    });

    await updateFindingStatus({
      findingId: finding.id,
      status: "REMEDIATED",
      resolutionNote: "Vendor provided MFA evidence.",
      resolvedById: reviewer.id,
    });

    // A rescore must NOT wipe the reviewer's decision.
    await scoreAssessment(assessment.id);

    const after = await prisma.finding.findUniqueOrThrow({
      where: { id: finding.id },
    });
    expect(after.status).toBe("REMEDIATED");
    expect(after.resolutionNote).toBe("Vendor provided MFA evidence.");
    expect(after.resolvedById).toBe(reviewer.id);
  });

  it("clears resolver fields when a finding is reopened", async () => {
    const finding = await prisma.finding.findFirstOrThrow({
      where: { assessment: { vendor: { name: VENDOR } } },
    });
    await updateFindingStatus({
      findingId: finding.id,
      status: "OPEN",
      resolvedById: "ignored-when-open",
    });
    const reopened = await prisma.finding.findUniqueOrThrow({
      where: { id: finding.id },
    });
    expect(reopened.status).toBe("OPEN");
    expect(reopened.resolvedAt).toBeNull();
    expect(reopened.resolvedById).toBeNull();
  });
});
