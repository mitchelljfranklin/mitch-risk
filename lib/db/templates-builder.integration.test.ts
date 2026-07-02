import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  addQuestion,
  addSection,
  createTemplate,
  duplicateTemplate,
  getControlWithMappings,
  getTemplateForBuilder,
  moveQuestion,
  moveSection,
} from "@/lib/db/templates";
import { prisma } from "@/lib/prisma";
import { type QuestionInput } from "@/lib/schemas/template";

const PREFIX = "P54 Builder";

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
  await prisma.template.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("template builder — reorder / duplicate / mappings", () => {
  it("moves sections and questions", async () => {
    const template = await createTemplate({
      name: `${PREFIX} Reorder`,
      description: "",
    });
    const s1 = await addSection(template.id, "First");
    const s2 = await addSection(template.id, "Second");
    const q1 = await addQuestion(
      s1.id,
      buildQuestion({ text: "Q1", type: "YES_NO" }),
    );
    const q2 = await addQuestion(
      s1.id,
      buildQuestion({ text: "Q2", type: "YES_NO" }),
    );

    await moveSection(s2.id, "up");
    await moveQuestion(q2.id, "up");

    const built = await getTemplateForBuilder(template.id);
    if (!built) throw new Error("template missing");
    expect(built.sections.map((s) => s.title)).toEqual(["Second", "First"]);
    const firstSection = built.sections.find((s) => s.title === "First");
    expect(firstSection?.questions.map((q) => q.id)).toEqual([q2.id, q1.id]);
  });

  it("duplicates a template as an independent copy with remapped conditions", async () => {
    const template = await createTemplate({
      name: `${PREFIX} Source`,
      description: "desc",
    });
    const section = await addSection(template.id, "Section");
    const gate = await addQuestion(
      section.id,
      buildQuestion({ text: "Do you enforce MFA?", type: "YES_NO" }),
    );
    await addQuestion(
      section.id,
      buildQuestion({
        text: "Which MFA method?",
        type: "FREE_TEXT",
        conditionalLogic: {
          match: "all",
          rules: [{ questionId: gate.id, operator: "equals", value: "YES" }],
        },
      }),
    );

    const cloneId = await duplicateTemplate(template.id);
    const clone = await getTemplateForBuilder(cloneId);
    if (!clone) throw new Error("clone missing");

    expect(clone.name).toBe(`${PREFIX} Source (copy)`);
    expect(clone.version).toBe(1);
    expect(clone.parentTemplateId).toBeNull();
    expect(clone.status).toBe("DRAFT");

    const cloneQuestions = clone.sections.flatMap((s) => s.questions);
    const cloneGate = cloneQuestions.find(
      (q) => q.text === "Do you enforce MFA?",
    );
    const cloneConditional = cloneQuestions.find(
      (q) => q.text === "Which MFA method?",
    );
    const rule = (
      cloneConditional?.conditionalLogic as { rules: { questionId: string }[] }
    ).rules[0];
    expect(rule.questionId).toBe(cloneGate?.id);
    expect(rule.questionId).not.toBe(gate.id);

    // Duplicating again yields a distinct "(copy 2)" name.
    const secondId = await duplicateTemplate(template.id);
    const second = await prisma.template.findUniqueOrThrow({
      where: { id: secondId },
    });
    expect(second.name).toBe(`${PREFIX} Source (copy 2)`);
  });

  it("returns mapped questions for a control", async () => {
    const control = await prisma.control.findFirst({ select: { id: true } });
    if (!control) throw new Error("no seeded control");

    const template = await createTemplate({
      name: `${PREFIX} Mapping`,
      description: "",
    });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({
        text: "Mapped question?",
        type: "YES_NO",
        controlIds: [control.id],
      }),
    );

    const mapped = await getControlWithMappings(control.id);
    if (!mapped) throw new Error("control missing");
    const templateIds = mapped.questionControls.map(
      (link) => link.question.section.template.id,
    );
    expect(templateIds).toContain(template.id);
  });
});
