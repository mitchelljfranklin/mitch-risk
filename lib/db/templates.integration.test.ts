import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  addQuestion,
  addSection,
  createNewVersion,
  createTemplate,
  getTemplateForBuilder,
  getTemplateVersionChain,
  importTemplateFromJson,
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
    conditionalLogic: { match: "all", rules: [] },
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
        conditionalLogic: {
          match: "all",
          rules: [{ questionId: mfa.id, operator: "equals", value: "YES" }],
        },
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
      (savedMc.conditionalLogic as { rules: { questionId: string }[] }).rules[0]
        .questionId,
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

    const cloneRule = (
      cloneMc.conditionalLogic as { rules: { questionId: string }[] }
    ).rules[0];
    expect(cloneRule.questionId).toBe(cloneMfa.id);
    expect(cloneRule.questionId).not.toBe(mfa.id);
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

    const questions = saved.sections.flatMap((section) => section.questions);
    expect(questions.length).toBe(3);

    const combobox = questions.find(
      (question) => question.text === "Cloud provider?",
    );
    const multi = questions.find(
      (question) => question.text === "Compliance frameworks?",
    );
    const rating = questions.find(
      (question) => question.text === "Rate maturity?",
    );
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

    // From the child version we must still see the full lineage (root + child),
    // not just the current node and its descendants.
    const v2Chain = await getTemplateVersionChain(v2Id);
    expect(v2Chain.map((entry) => entry.id)).toEqual(
      chain.map((entry) => entry.id),
    );
    expect(v2Chain.some((entry) => entry.id === template.id)).toBe(true);
    expect(v2Chain.some((entry) => entry.id === v2Id)).toBe(true);

    await prisma.template.deleteMany({
      where: { name: TEST_TEMPLATE_NAME + " Chain" },
    });
  });
});

describe("template import (integration)", () => {
  const IMPORT_TEMPLATE_NAME = TEST_TEMPLATE_NAME + " Import";

  beforeAll(async () => {
    await prisma.template.deleteMany({ where: { name: IMPORT_TEMPLATE_NAME } });
  });

  it("persists MULTI_SELECT expectedAnswer as an array and NUMERIC as a number", async () => {
    const result = await importTemplateFromJson({
      name: IMPORT_TEMPLATE_NAME,
      sections: [
        {
          title: "Section",
          questions: [
            {
              text: "Compliance frameworks?",
              type: "MULTI_SELECT",
              riskWeight: "MEDIUM",
              required: true,
              options: ["SOC2", "ISO27001", "PCI"],
              expectedAnswer: ["SOC2", "ISO27001"],
            },
            {
              text: "Minimum key length?",
              type: "NUMERIC",
              riskWeight: "HIGH",
              required: true,
              expectedAnswer: 256,
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);

    const saved = await getTemplateForBuilder(result.templateId);
    if (!saved) throw new Error("template not found");

    const questions = saved.sections.flatMap((section) => section.questions);
    const multi = questions.find(
      (question) => question.text === "Compliance frameworks?",
    );
    const numeric = questions.find(
      (question) => question.text === "Minimum key length?",
    );
    if (!multi || !numeric) throw new Error("questions missing");

    expect(multi.options).toEqual(["SOC2", "ISO27001", "PCI"]);
    expect(multi.expectedAnswer).toEqual(["SOC2", "ISO27001"]);
    expect(numeric.expectedAnswer).toBe(256);

    await prisma.template.deleteMany({ where: { name: IMPORT_TEMPLATE_NAME } });
  });

  it("rejects a MULTI_SELECT expectedAnswer that is not an array", async () => {
    const result = await importTemplateFromJson({
      name: IMPORT_TEMPLATE_NAME,
      sections: [
        {
          title: "Section",
          questions: [
            {
              text: "Compliance frameworks?",
              type: "MULTI_SELECT",
              riskWeight: "MEDIUM",
              required: true,
              options: ["SOC2", "ISO27001"],
              expectedAnswer: "SOC2",
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected import to fail");
    expect(result.error).toMatch(/array of strings/);
  });

  it("rejects a NUMERIC expectedAnswer that is not a number", async () => {
    const result = await importTemplateFromJson({
      name: IMPORT_TEMPLATE_NAME,
      sections: [
        {
          title: "Section",
          questions: [
            {
              text: "Minimum key length?",
              type: "NUMERIC",
              riskWeight: "HIGH",
              required: true,
              expectedAnswer: "256",
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected import to fail");
    expect(result.error).toMatch(/number/);
  });

  it("persists MULTIPLE_CHOICE expectedAnswer as an array of accepted answers", async () => {
    const result = await importTemplateFromJson({
      name: IMPORT_TEMPLATE_NAME,
      sections: [
        {
          title: "Section",
          questions: [
            {
              text: "Implementation maturity?",
              type: "MULTIPLE_CHOICE",
              riskWeight: "HIGH",
              required: true,
              options: ["Not Done", "Implemented", "Optimized", "Perfect"],
              expectedAnswer: ["Optimized", "Perfect"],
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);

    const saved = await getTemplateForBuilder(result.templateId);
    if (!saved) throw new Error("template not found");

    const question = saved.sections[0].questions[0];
    expect(question.options).toEqual([
      "Not Done",
      "Implemented",
      "Optimized",
      "Perfect",
    ]);
    expect(question.expectedAnswer).toEqual(["Optimized", "Perfect"]);

    await prisma.template.deleteMany({ where: { name: IMPORT_TEMPLATE_NAME } });
  });

  it("rejects a MULTIPLE_CHOICE expectedAnswer that is a number", async () => {
    const result = await importTemplateFromJson({
      name: IMPORT_TEMPLATE_NAME,
      sections: [
        {
          title: "Section",
          questions: [
            {
              text: "Implementation maturity?",
              type: "MULTIPLE_CHOICE",
              riskWeight: "HIGH",
              required: true,
              options: ["Not Done", "Implemented"],
              expectedAnswer: 1,
            },
          ],
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected import to fail");
    expect(result.error).toMatch(/string/);
  });
});
