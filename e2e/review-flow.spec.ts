import { expect, test } from "@playwright/test";

import {
  getAssessmentByToken,
  createAssessment,
  saveResponses,
  sendAssessment,
  submitAssessment,
} from "@/lib/db/assessments";
import { prisma } from "@/lib/prisma";
import {
  addQuestion,
  addSection,
  createTemplate,
  publishTemplate,
} from "@/lib/db/templates";
import { createVendor, deleteVendor } from "@/lib/db/vendors";
import { findUserByEmail } from "@/lib/db/users";
import { type QuestionInput } from "@/lib/schemas/template";

import { E2E_REVIEWER_EMAIL, E2E_REVIEWER_PASSWORD } from "./global-setup";

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

let assessmentId = "";
let vendorId = "";
let responseCount = 0;

test.beforeAll(async () => {
  const template = await createTemplate({
    name: `E2E Review ${Date.now()}`,
    description: "",
  });
  const section = await addSection(template.id, "General");
  await addQuestion(
    section.id,
    buildQuestion({ text: "Is MFA enforced?", type: "YES_NO" }),
  );
  await addQuestion(
    section.id,
    buildQuestion({
      text: "Describe your logging pipeline",
      type: "FREE_TEXT",
      required: false,
    }),
  );
  await publishTemplate(template.id);

  const vendor = await createVendor({
    name: `E2E Review ${Date.now()} Vendor`,
    contactName: "",
    contactEmail: "review-flow@example.test",
    tier: "",
    website: "",
    notes: "",
  });
  const reviewer = await findUserByEmail(E2E_REVIEWER_EMAIL);
  if (!reviewer) throw new Error("e2e reviewer missing");

  const assessment = await createAssessment(vendor.id, {
    title: `E2E Review Cycle ${Date.now()}`,
    templateId: template.id,
    dueDate: "",
    reviewerId: reviewer.id,
  });
  await sendAssessment(assessment.id);
  const sent = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessment.id },
    select: { accessToken: true },
  });

  // Complete the questionnaire server-side so the reviewer has something to
  // act on - the vendor-side flow is covered by the other specs.
  const token = sent.accessToken ?? "";
  const portal = await getAssessmentByToken(token);
  if (!portal) throw new Error("portal lookup failed");
  const portalQuestions = portal.questions.map((question) => ({
    id: question.id,
    type: question.type as string,
  }));
  if (portalQuestions.length === 0) throw new Error("no questions");
  responseCount = portalQuestions.length;
  await saveResponses(
    token,
    portalQuestions.map((question) => ({
      assessmentQuestionId: question.id,
      value:
        question.type === "YES_NO"
          ? "YES"
          : "Splunk shipping to a centralised log workspace.",
      isNotApplicable: false,
    })),
  );
  await submitAssessment(token);

  assessmentId = assessment.id;
  vendorId = vendor.id;
});

test.afterAll(async () => {
  await deleteVendor(vendorId);
});

async function signInAsReviewer(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_REVIEWER_EMAIL);
  await page.getByLabel("Password").fill(E2E_REVIEWER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

async function expandAllReviewPanels(page: import("@playwright/test").Page) {
  // Wait out any route skeleton, tolerating both fresh pages (Expand
  // triggers) and already-expanded states after a reload (only Collapse).
  await expect(
    page.getByRole("button", { name: /Expand|Collapse/ }).first(),
  ).toBeVisible({ timeout: 15000 });

  let guard = 0;
  while (
    (await page.getByRole("button", { name: "Expand" }).count()) > 0 &&
    guard < 20
  ) {
    await page.getByRole("button", { name: "Expand" }).first().click();
    guard++;
    // The clicked panel re-renders its trigger to "Collapse".
    await page.waitForTimeout(150);
  }
}

// Radix Selects are not native <select> elements; Playwright's selectOption
// mutates the DOM without updating React state. Drive the visible trigger +
// listbox so the app actually receives the change.
async function pickDecision(
  page: import("@playwright/test").Page,
  panel: import("@playwright/test").Locator,
  optionLabel: string,
) {
  await panel.getByRole("combobox").click();
  const listbox = page.getByRole("listbox");
  await listbox.waitFor({ state: "visible", timeout: 5000 });
  await listbox.getByRole("option", { name: optionLabel }).click();
}

// Revalidating this heavy route can take tens of seconds; a premature reload
// aborts the in-flight action and silently loses the decision, so patience
// outranks retries here.
async function saveFirstPendingDecision(
  page: import("@playwright/test").Page,
  optionLabel: string,
) {
  const expectedForms = responseCount - 1;
  await expandAllReviewPanels(page);
  const panels = page.locator('form:has(select[name="decision"])');
  if ((await panels.count()) === 0) return false;

  await pickDecision(page, panels.first(), optionLabel);
  if (optionLabel === "Request clarification") {
    await panels
      .first()
      .locator('textarea[name="note"]')
      .fill("Please quantify coverage for third-party accounts.");
  }
  await panels.first().getByRole("button", { name: "Save" }).click();
  // The very first interaction on a freshly navigated heavy page can race
  // the lazy action-chunk download; give the POST room to finish.
  await page.waitForTimeout(3000);
  try {
    await expect(page.locator('form:has(select[name="decision"])')).toHaveCount(
      expectedForms,
      { timeout: 60000 },
    );
    return true;
  } catch {
    throw new Error(
      `Saving decision "${optionLabel}" did not persist within 60s.`,
    );
  }
}

// Next 16's Server-Action response streaming crashes on Node >= 23
// ("transformAlgorithm is not a function" after revalidatePath in the
// action), which is an environment bug, not an application one - CI runs
// the suite under Node 22 where it executes normally.
const NODE_MAJOR = Number(process.versions.node.split(".")[0]);

test.describe("reviewer decision cycle", () => {
  test.skip(
    NODE_MAJOR >= 23,
    "Server Action streaming is broken on Node >= 23 (Next 16 known issue); run e2e under Node 22.",
  );

  test("reviewer records clarification then approvals across all answers", async ({
    page,
  }) => {
    const diagnostics: string[] = [];
    page.on("pageerror", (error) =>
      diagnostics.push(`[pageerror] ${String(error).slice(0, 200)}`),
    );
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        diagnostics.push(
          `[console.${message.type()}] ${message.text().slice(0, 200)}`,
        );
      }
    });
    page.on("response", (response) => {
      if (response.request().method() === "POST") {
        diagnostics.push(`[POST] ${response.url()} -> ${response.status()}`);
      }
    });

    await signInAsReviewer(page);
    await page.goto(`/assessments/${assessmentId}`);
    await expandAllReviewPanels(page);
    await expect(page.locator('form:has(select[name="decision"])')).toHaveCount(
      responseCount,
    );

    try {
      await saveFirstPendingDecision(page, "Request clarification");
    } catch (error) {
      throw new Error(
        `${String(error)}\nDiagnostics:\n${diagnostics.slice(-12).join("\n")}`,
      );
    }

    let approvals = 0;
    while (
      (await page.locator('form:has(select[name="decision"])').count()) > 0 &&
      approvals < responseCount + 1
    ) {
      approvals++;
      await saveFirstPendingDecision(page, "Approve");
    }

    // The counters reflect one clarification plus the remaining approvals.
    await expect(page.getByText(/Clarification \(1\)/)).toBeVisible();

    // Final state check from a clean navigation: no editable decision form may
    // remain anywhere once every response carries a review.
    await page.goto(`/assessments/${assessmentId}`);
    await expandAllReviewPanels(page);
    await expect(page.locator('form:has(select[name="decision"])')).toHaveCount(
      0,
    );
  });
});
