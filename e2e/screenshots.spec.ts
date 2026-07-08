import { test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

const SCREENSHOT_DIR = "docs/screenshots";

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

test("capture dashboard screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/dashboard.png`,
    fullPage: true,
  });
});

test("capture vendor detail screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page.getByRole("link", { name: "Vendors" }).click();
  await page.waitForURL("**/vendors");
  await page
    .getByRole("link")
    .filter({ hasText: "Demo AgileFort" })
    .first()
    .click();
  await page.waitForURL("**/vendors/**");
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/vendor-detail.png`,
    fullPage: true,
  });
});

test("capture assessment review screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page.getByRole("link", { name: "Assessments" }).click();
  await page.waitForURL("**/assessments");
  await page.getByText("E2E Assessment").click();
  await page.waitForURL("**/assessments/**");
  await page.waitForSelector("text=E2E Assessment");
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/assessment-review.png`,
    fullPage: true,
  });
});

test("capture template builder screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page.getByRole("link", { name: "Templates" }).click();
  await page.waitForURL("**/templates");
  await page.getByText("E2E Template").click();
  await page.waitForURL("**/templates/**");
  await page.waitForSelector("text=E2E Template");
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/template-builder.png`,
    fullPage: true,
  });
});

test("capture settings screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/settings?tab=scoring");
  await page.waitForSelector("text=Scoring");
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/settings.png`,
    fullPage: true,
  });
});
