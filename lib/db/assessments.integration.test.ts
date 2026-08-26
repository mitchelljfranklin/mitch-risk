import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAssessment,
  getAssessmentByToken,
  getAssessmentForToken,
  isTokenExpired,
  listAssessments,
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

const VENDOR_NAME = "P3 Integration Vendor";
const TEMPLATE_NAME = "P3 Integration Template";

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

describe("assessment lifecycle (integration)", () => {
  it("snapshots on send, validates the token, autosaves, and submits", async () => {
    const template = await createTemplate({
      name: TEMPLATE_NAME,
      description: "",
    });
    const section = await addSection(template.id, "Access");
    const mfa = await addQuestion(
      section.id,
      buildQuestion({
        text: "Enforce MFA?",
        type: "YES_NO",
        expectedAnswer: "YES",
      }),
    );
    await addQuestion(
      section.id,
      buildQuestion({
        text: "MFA method?",
        type: "FREE_TEXT",
        conditionalLogic: {
          match: "all",
          rules: [{ questionId: mfa.id, operator: "equals", value: "YES" }],
        },
      }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: VENDOR_NAME,
      contactName: "",
      contactEmail: "vendor@example.test",
      tier: "",
      website: "",
      notes: "",
    });

    const assessment = await createAssessment(vendor.id, {
      title: "Annual review",
      templateId: template.id,
      dueDate: "",
      reviewerId: "",
    });
    expect(assessment.status).toBe("DRAFT");

    await sendAssessment(assessment.id);

    const sent = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
      select: { accessToken: true },
    });
    const token = sent.accessToken;
    if (!token) {
      throw new Error("access token was not generated");
    }

    const portal = await getAssessmentByToken(token);
    if (!portal) {
      throw new Error("portal assessment not found");
    }

    expect(portal.status).toBe("SENT");
    expect(portal.questions.length).toBe(2);

    const snapshotMfa = portal.questions.find(
      (question) => question.text === "Enforce MFA?",
    );
    const snapshotMethod = portal.questions.find(
      (question) => question.text === "MFA method?",
    );
    if (!snapshotMfa || !snapshotMethod) {
      throw new Error("snapshot questions missing");
    }

    const snapshotRule = (
      snapshotMethod.conditionalLogic as {
        rules: { questionId: string }[];
      }
    ).rules[0];
    expect(snapshotRule.questionId).toBe(snapshotMfa.id);
    expect(snapshotRule.questionId).not.toBe(mfa.id);

    await saveResponses(token, [
      {
        assessmentQuestionId: snapshotMfa.id,
        value: "YES",
        isNotApplicable: false,
      },
    ]);
    expect((await getAssessmentForToken(token))?.status).toBe("IN_PROGRESS");

    const incomplete = await submitAssessment(token);
    expect(incomplete.ok).toBe(false);
    expect(incomplete.missing).toBe(1);

    await saveResponses(token, [
      {
        assessmentQuestionId: snapshotMethod.id,
        value: "Authenticator app",
        isNotApplicable: false,
      },
    ]);
    const submitted = await submitAssessment(token);
    expect(submitted.ok).toBe(true);
    expect((await getAssessmentForToken(token))?.status).toBe("SUBMITTED");

    const afterSubmit = await saveResponses(token, [
      {
        assessmentQuestionId: snapshotMfa.id,
        value: "NO",
        isNotApplicable: false,
      },
    ]);
    expect(afterSubmit.ok).toBe(false);

    expect(await getAssessmentForToken("not-a-real-token")).toBeNull();
    expect(isTokenExpired(new Date(Date.now() - 1000))).toBe(true);

    await revokeAssessmentToken(assessment.id);
    expect(await getAssessmentByToken(token)).toBeNull();
  });
});

describe("assessment search (integration)", () => {
  it("filters by status", async () => {
    const drafts = await listAssessments({ status: "DRAFT" });
    if (drafts.assessments.length > 0) {
      expect(
        drafts.assessments.every((assessment) => assessment.status === "DRAFT"),
      ).toBe(true);
    }
  });

  it("filters by query matching title or vendor name", async () => {
    const all = await listAssessments();
    if (all.assessments.length > 0) {
      const titleResults = await listAssessments({
        query: all.assessments[0].title.slice(0, 4),
      });
      expect(titleResults.assessments.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns empty for nonexistent query", async () => {
    const results = await listAssessments({
      query: "zzz-nonexistent-assessment-98765",
    });
    expect(results.assessments.length).toBe(0);
    expect(results.totalCount).toBe(0);
  });

  it("overdue filter returns only past-due SENT/IN_PROGRESS assessments", async () => {
    const overdue = await listAssessments({ overdue: true });
    const now = new Date();
    for (const assessment of overdue.assessments) {
      expect(["SENT", "IN_PROGRESS"]).toContain(assessment.status);
      expect(assessment.dueDate).not.toBeNull();
      if (assessment.dueDate) {
        expect(assessment.dueDate.getTime()).toBeLessThan(now.getTime());
      }
    }
  });
});

describe("assessment freeze determinism (integration)", () => {
  const FREEZE_VENDOR_NAME = "P3 Freeze Vendor";
  const FREEZE_TEMPLATE_NAME = "P3 Freeze Template";

  function buildFreezeQuestion(text: string): QuestionInput {
    return {
      helpText: "",
      riskWeight: "LOW",
      required: false,
      options: [],
      expectedAnswer: "",
      conditionalLogic: { match: "all", rules: [] },
      controlIds: [],
      text,
      type: "YES_NO",
    };
  }

  async function freezeCleanup() {
    await prisma.vendor.deleteMany({ where: { name: FREEZE_VENDOR_NAME } });
    await prisma.template.deleteMany({
      where: { name: FREEZE_TEMPLATE_NAME },
    });
  }

  beforeAll(freezeCleanup);

  afterAll(async () => {
    await freezeCleanup();
    await prisma.$disconnect();
  });

  it("maps conditional logic to exact snapshot ids on a multi-section template", async () => {
    const template = await createTemplate({
      name: FREEZE_TEMPLATE_NAME,
      description: "",
    });
    const sectionA = await addSection(template.id, "Section A");
    const sectionB = await addSection(template.id, "Section B");
    const sectionC = await addSection(template.id, "Section C");

    const gate = await addQuestion(
      sectionA.id,
      buildFreezeQuestion("GATE question"),
    );
    const fillers = [
      { sectionId: sectionA.id, text: "Filler A2" },
      { sectionId: sectionB.id, text: "Filler B1" },
      { sectionId: sectionB.id, text: "Filler B2" },
      { sectionId: sectionB.id, text: "Filler B3" },
      { sectionId: sectionC.id, text: "Filler C1" },
      { sectionId: sectionC.id, text: "Filler C2" },
    ];
    for (const filler of fillers) {
      await addQuestion(filler.sectionId, buildFreezeQuestion(filler.text));
    }
    await addQuestion(
      sectionC.id,
      buildQuestion({
        text: "GATED TARGET",
        type: "YES_NO",
        conditionalLogic: {
          match: "all",
          rules: [{ questionId: gate.id, operator: "equals", value: "YES" }],
        },
      }),
    );

    await publishTemplate(template.id);
    const vendor = await createVendor({
      name: FREEZE_VENDOR_NAME,
      contactName: "",
      contactEmail: "freeze@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "Freeze determinism",
      templateId: template.id,
      dueDate: "",
      reviewerId: "",
    });

    await sendAssessment(assessment.id);

    const frozen = await prisma.assessmentQuestion.findMany({
      where: { assessmentId: assessment.id },
      orderBy: { order: "asc" },
    });

    expect(frozen.length).toBe(8);
    expect(frozen.map((question) => question.order)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(new Set(frozen.map((question) => question.id)).size).toBe(8);

    const frozenGate = frozen.find(
      (question) => question.text === "GATE question",
    );
    const frozenTarget = frozen.find(
      (question) => question.text === "GATED TARGET",
    );
    if (!frozenGate || !frozenTarget) {
      throw new Error("frozen questions missing");
    }

    expect(frozenGate.id).not.toBe(gate.id);
    const rule = (
      frozenTarget.conditionalLogic as {
        rules: { questionId: string }[];
      }
    ).rules[0];
    expect(rule.questionId).toBe(frozenGate.id);
    expect(rule.questionId).not.toBe(gate.id);
  });
});
