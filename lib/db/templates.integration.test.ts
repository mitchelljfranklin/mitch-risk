import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  addQuestion,
  addSection,
  createNewVersion,
  createTemplate,
  getTemplateForBuilder,
  getTemplateVersionChain,
  publishTemplate,
} from "@/lib/db/templates";
import { prisma } from "@/lib/prisma";
import { type QuestionInput } from "@/lib/schemas/template";

const TEST_TEMPLATE_NAME = "P2 Integration Template";

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
  await prisma.template.deleteMany({ where: { name: TEST_TEMPLATE_NAME } });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("template builder (integration)", () => {
  it("persists all question types, mappings, and conditional logic, then versions correctly", async () => {
    const controls = await prisma.control.findMany({ take: 2 });
    expect(controls.length).toBe(2);
    const [controlA, controlB] = controls;

    const template = await createTemplate({
      name: TEST_TEMPLATE_NAME,
      description: "Phase 2 integration",
    });
    expect(template.status).toBe("DRAFT");
    expect(template.version).toBe(1);

    const access = await addSection(template.id, "Access Control");
    const encryption = await addSection(template.id, "Encryption");

    const mfa = await addQuestion(
      access.id,
      buildQuestion({
        text: "Do you enforce MFA?",
        type: "YES_NO",
        riskWeight: "CRITICAL",
        expectedAnswer: "YES",
        controlIds: [controlA.id],
      }),
    );

    await addQuestion(
      access.id,
      buildQuestion({
        text: "Which MFA method?",
        type: "MULTIPLE_CHOICE",
        riskWeight: "HIGH",
        options: ["TOTP", "SMS", "Hardware key"],
        expectedAnswer: "Hardware key",
        controlIds: [controlB.id],
        conditionQuestionId: mfa.id,
        conditionEquals: "YES",
      }),
    );

    await addQuestion(
      encryption.id,
      buildQuestion({
        text: "Minimum key length (bits)?",
        type: "NUMERIC",
        expectedAnswer: "256",
      }),
    );
    await addQuestion(
      encryption.id,
      buildQuestion({
        text: "Describe key management",
        type: "FREE_TEXT",
        required: false,
      }),
    );
    await addQuestion(
      encryption.id,
      buildQuestion({ text: "Last key rotation date", type: "DATE" }),
    );
    await addQuestion(
      encryption.id,
      buildQuestion({
        text: "Upload your cryptography policy",
        type: "FILE_UPLOAD",
      }),
    );

    const saved = await getTemplateForBuilder(template.id);
    if (!saved) {
      throw new Error("template not found");
    }

    expect(saved.sections.length).toBe(2);
    const savedQuestions = saved.sections.flatMap(
      (section) => section.questions,
    );
    expect(savedQuestions.length).toBe(6);
    expect(new Set(savedQuestions.map((question) => question.type))).toEqual(
      new Set([
        "YES_NO",
        "MULTIPLE_CHOICE",
        "NUMERIC",
        "FREE_TEXT",
        "DATE",
        "FILE_UPLOAD",
      ]),
    );

    const savedMfa = savedQuestions.find(
      (question) => question.text === "Do you enforce MFA?",
    );
    const savedMc = savedQuestions.find(
      (question) => question.text === "Which MFA method?",
    );
    const savedNumeric = savedQuestions.find(
      (question) => question.type === "NUMERIC",
    );
    if (!savedMfa || !savedMc || !savedNumeric) {
      throw new Error("expected questions missing");
    }

    expect(savedMfa.expectedAnswer).toBe("YES");
    expect(savedMfa.controls.map((link) => link.controlId)).toEqual([
      controlA.id,
    ]);
    expect(savedMc.options).toEqual(["TOTP", "SMS", "Hardware key"]);
    expect(savedMc.expectedAnswer).toBe("Hardware key");
    expect(savedNumeric.expectedAnswer).toBe(256);
    expect(
      (savedMc.conditionalLogic as { questionId: string }).questionId,
    ).toBe(savedMfa.id);

    const published = await publishTemplate(template.id);
    expect(published.status).toBe("PUBLISHED");

    const newVersionId = await createNewVersion(template.id);
    const clone = await getTemplateForBuilder(newVersionId);
    if (!clone) {
      throw new Error("clone not found");
    }

    expect(clone.version).toBe(2);
    expect(clone.status).toBe("DRAFT");
    expect(clone.parentTemplateId).toBe(template.id);

    const cloneQuestions = clone.sections.flatMap(
      (section) => section.questions,
    );
    expect(cloneQuestions.length).toBe(6);

    const cloneMfa = cloneQuestions.find(
      (question) => question.text === "Do you enforce MFA?",
    );
    const cloneMc = cloneQuestions.find(
      (question) => question.text === "Which MFA method?",
    );
    if (!cloneMfa || !cloneMc) {
      throw new Error("clone questions missing");
    }

    expect(
      (cloneMc.conditionalLogic as { questionId: string }).questionId,
    ).toBe(cloneMfa.id);
    expect(
      (cloneMc.conditionalLogic as { questionId: string }).questionId,
    ).not.toBe(mfa.id);
    expect(cloneMc.controls.map((link) => link.controlId)).toEqual([
      controlB.id,
    ]);
  });
});

describe("template new question types (integration)", () => {
  it("persists COMBOBOX, MULTI_SELECT, and RATING question types", async () => {
    const controls = await prisma.control.findMany({ take: 1 });
    expect(controls.length).toBe(1);

    const template = await createTemplate({
      name: TEST_TEMPLATE_NAME + " v2",
      description: "New types",
    });
    const section = await addSection(template.id, "Section");

    await addQuestion(
      section.id,
      buildQuestion({
        text: "Cloud provider?",
        type: "COMBOBOX",
        options: ["AWS", "GCP", "Azure"],
        expectedAnswer: "AWS",
        controlIds: [controls[0].id],
      }),
    );
    await addQuestion(
      section.id,
      buildQuestion({
        text: "Compliance frameworks?",
        type: "MULTI_SELECT",
        options: ["SOC2", "ISO27001", "PCI", "HIPAA"],
        expectedAnswer: ["SOC2", "ISO27001"],
        controlIds: [controls[0].id],
      }),
    );
    await addQuestion(
      section.id,
      buildQuestion({
        text: "Rate maturity?",
        type: "RATING",
        expectedAnswer: 4,
      }),
    );

    const saved = await getTemplateForBuilder(template.id);
    if (!saved) throw new Error("template not found");

    const qs = saved.sections.flatMap((s) => s.questions);
    expect(qs.length).toBe(3);

    const combobox = qs.find((q) => q.text === "Cloud provider?");
    const multi = qs.find((q) => q.text === "Compliance frameworks?");
    const rating = qs.find((q) => q.text === "Rate maturity?");
    if (!combobox || !multi || !rating) throw new Error("questions missing");

    expect(combobox.type).toBe("COMBOBOX");
    expect(combobox.options).toEqual(["AWS", "GCP", "Azure"]);
    expect(combobox.expectedAnswer).toBe("AWS");
    expect(combobox.controls[0].controlId).toBe(controls[0].id);

    expect(multi.type).toBe("MULTI_SELECT");
    expect(multi.options).toEqual(["SOC2", "ISO27001", "PCI", "HIPAA"]);
    expect(multi.expectedAnswer).toEqual(["SOC2", "ISO27001"]);

    expect(rating.type).toBe("RATING");
    expect(rating.expectedAnswer).toBe(4);

    await prisma.template.deleteMany({
      where: { name: TEST_TEMPLATE_NAME + " v2" },
    });
  });
});

describe("template version chain", () => {
  it("returns sorted version chain for a template with multiple versions", async () => {
    const template = await createTemplate({
      name: TEST_TEMPLATE_NAME + " Chain",
      description: "Chain test",
    });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({ text: "Q1?", type: "YES_NO" }),
    );
    await publishTemplate(template.id);

    const v2Id = await createNewVersion(template.id);
    await publishTemplate(v2Id);

    const chain = await getTemplateVersionChain(template.id);
    expect(chain.length).toBeGreaterThanOrEqual(2);

    const v2Chain = await getTemplateVersionChain(v2Id);
    expect(v2Chain.length).toBeGreaterThanOrEqual(1);

    await prisma.template.deleteMany({
      where: { name: TEST_TEMPLATE_NAME + " Chain" },
    });
  });
});
