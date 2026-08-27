import { expect, test } from "@playwright/test";

import {
  addQuestion,
  addSection,
  createTemplate,
  publishTemplate,
} from "@/lib/db/templates";
import { createAssessment, sendAssessment } from "@/lib/db/assessments";
import { createVendor, deleteVendor } from "@/lib/db/vendors";
import { prisma } from "@/lib/prisma";
import { type QuestionInput } from "@/lib/schemas/template";

// Self-contained fixture: builds a minimal one-section template, sends an
// assessment for it and returns the portal token plus the vendor id for
// cleanup. Lives per-spec so the shared E2E Assessment journey is untouched.
async function createPortalFixture(
  questions: QuestionInput[],
): Promise<{ token: string; vendorId: string; assessmentId: string }> {
  const name = `E2E Portal ${Date.now()}`;
  const template = await createTemplate({ name, description: "" });
  const section = await addSection(template.id, "General");
  for (const question of questions) {
    await addQuestion(section.id, question);
  }
  await publishTemplate(template.id);

  const vendor = await createVendor({
    name: `${name} Vendor`,
    contactName: "",
    contactEmail: "portal-journey@example.test",
    tier: "",
    website: "",
    notes: "",
  });
  const assessment = await createAssessment(vendor.id, {
    title: `${name} Assessment`,
    templateId: template.id,
    dueDate: "",
    reviewerId: "",
  });
  await sendAssessment(assessment.id);

  const sent = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessment.id },
    select: { accessToken: true },
  });
  return {
    token: sent.accessToken ?? "",
    vendorId: vendor.id,
    assessmentId: assessment.id,
  };
}

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

test("a conditionally-revealed question gates visibility and required validation", async ({
  page,
}) => {
  const gateQuestion = buildQuestion({
    text: "Is all data at rest encrypted?",
    type: "YES_NO",
  });
  const conditionalChild = buildQuestion({
    text: "Describe your encryption tooling",
    type: "FREE_TEXT",
    conditionalLogic: {
      match: "all",
      rules: [
        {
          questionId: "", // patched below to the persisted gate question id
          operator: "equals",
          value: "YES",
        },
      ],
    },
  });

  // The rule must reference the stored question id of the gate question.
  const template = await createTemplate({
    name: `E2E Conditional ${Date.now()}`,
    description: "",
  });
  const section = await addSection(template.id, "General");
  const storedGate = await addQuestion(section.id, gateQuestion);
  conditionalChild.conditionalLogic!.rules[0]!.questionId = storedGate.id;
  await addQuestion(section.id, conditionalChild);
  await publishTemplate(template.id);

  const vendor = await createVendor({
    name: `E2E Conditional ${Date.now()} Vendor`,
    contactName: "",
    contactEmail: "conditional@example.test",
    tier: "",
    website: "",
    notes: "",
  });
  const assessment = await createAssessment(vendor.id, {
    title: "E2E Conditional Assessment",
    templateId: template.id,
    dueDate: "",
    reviewerId: "",
  });
  await sendAssessment(assessment.id);
  const sent = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessment.id },
    select: { accessToken: true },
  });

  try {
    await page.goto(`/portal/${sent.accessToken}`);
    await expect(
      page.getByRole("heading", { name: "E2E Conditional Assessment" }),
    ).toBeVisible();

    // Child is hidden while the gate answer does not satisfy the rule.
    await expect(
      page.getByText("Describe your encryption tooling"),
    ).toHaveCount(0);

    const gateGroup = page.getByRole("radiogroup").first();

    // Satisfy the rule -> child appears.
    await gateGroup.getByLabel("Yes").check();
    await expect(
      page.getByText("Describe your encryption tooling"),
    ).toBeVisible();

    // Fill the conditional answer, then un-satisfy the rule: a hidden
    // required question must never block submission.
    await page.locator("textarea").first().fill("BitLocker across endpoints.");
    await gateGroup.getByLabel("No").check();
    await expect(
      page.getByText("Describe your encryption tooling"),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Submit questionnaire" }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(
      page.getByText("Your responses have been submitted."),
    ).toBeVisible();
  } finally {
    await deleteVendor(vendor.id);
  }
});

test("autosave persists progress that survives a full reload", async ({
  page,
}) => {
  // Owns a dedicated fixture so the shared E2E Assessment's submit state
  // from the sibling spec cannot bleed into this journey.
  const fixture = await createPortalFixture([
    buildQuestion({ text: "Do you enforce MFA?", type: "YES_NO" }),
    buildQuestion({
      text: "Describe your access policy",
      type: "FREE_TEXT",
    }),
  ]);

  try {
    await page.goto(`/portal/${fixture.token}`);
    await expect(
      page.getByRole("heading", { name: /E2E Portal \d+ Assessment/ }),
    ).toBeVisible();

    const draftAnswer =
      "Role-based access control with quarterly entitlement reviews.";
    await page.locator("textarea").first().fill(draftAnswer);

    // Autosave indicator confirms the server round-trip happened before the
    // reload - exactly the path that used to silently drop progress.
    await expect(page.getByText(/^Saved at |^Last saved at /)).toBeVisible({
      timeout: 15000,
    });

    await page.reload();
    await expect(
      page.getByRole("heading", { name: /E2E Portal \d+ Assessment/ }),
    ).toBeVisible();
    await expect(page.locator("textarea").first()).toHaveValue(draftAnswer);

    await page.getByLabel("Yes").check();
    await page.getByRole("button", { name: "Submit questionnaire" }).click();
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(
      page.getByText("Your responses have been submitted."),
    ).toBeVisible();
  } finally {
    await deleteVendor(fixture.vendorId);
  }
});
