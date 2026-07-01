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
    conditionQuestionId: "",
    conditionEquals: "",
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
        conditionQuestionId: mfa.id,
        conditionEquals: "YES",
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

    const snapshotMfa = portal.questions.find((q) => q.text === "Enforce MFA?");
    const snapshotMethod = portal.questions.find(
      (q) => q.text === "MFA method?",
    );
    if (!snapshotMfa || !snapshotMethod) {
      throw new Error("snapshot questions missing");
    }

    expect(
      (snapshotMethod.conditionalLogic as { questionId: string }).questionId,
    ).toBe(snapshotMfa.id);
    expect(
      (snapshotMethod.conditionalLogic as { questionId: string }).questionId,
    ).not.toBe(mfa.id);

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
    if (drafts.length > 0) {
      expect(drafts.every((a) => a.status === "DRAFT")).toBe(true);
    }
  });

  it("filters by query matching title or vendor name", async () => {
    const all = await listAssessments();
    if (all.length > 0) {
      const titleResults = await listAssessments({
        query: all[0].title.slice(0, 4),
      });
      expect(titleResults.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns empty for nonexistent query", async () => {
    const results = await listAssessments({
      query: "zzz-nonexistent-assessment-98765",
    });
    expect(results.length).toBe(0);
  });
});
