import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

test("a vendor completes the questionnaire via the no-login portal", async ({
  page,
}) => {
  const token = readFileSync("e2e/.portal-token", "utf8").trim();
  expect(token.length).toBeGreaterThan(0);

  await page.goto(`/portal/${token}`);
  await expect(
    page.getByRole("heading", { name: "E2E Assessment" }),
  ).toBeVisible();

  await page.getByLabel("Yes").check();
  await page
    .locator("textarea")
    .first()
    .fill("We use role-based access control with least privilege.");

  // The upload validator sniffs magic bytes, so the fixture must be a real
  // PDF header - a plain-text buffer is correctly rejected as not-a-PDF.
  const minimalPdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
    "utf8",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "policy.pdf",
    mimeType: "application/pdf",
    buffer: minimalPdf,
  });
  await expect(page.getByText("Uploaded: policy.pdf")).toBeVisible();

  await page.getByRole("button", { name: "Submit questionnaire" }).click();
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(
    page.getByText("Your responses have been submitted."),
  ).toBeVisible();
});

test("an invalid token shows a not-found message", async ({ page }) => {
  await page.goto("/portal/not-a-real-token");
  await expect(page.getByText("Link not found")).toBeVisible();
});
