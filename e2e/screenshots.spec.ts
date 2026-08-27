import { expect, test } from "@playwright/test";

import { signInAsAdmin } from "./helpers";

const SCREENSHOT_DIR = "docs/screenshots";

test.use({ viewport: { width: 1280, height: 800 } });

test("capture dashboard screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
  );
  await page.waitForTimeout(3000);
  // Landmark asserts make this a real prod-build smoke test: a broken
  // page fails here instead of silently capturing a blank screenshot.
  await expect(
    page.getByRole("heading", { name: "Vendor risk overview" }),
  ).toBeVisible();
  await expect(page.getByText(/tracked/).first()).toBeVisible();
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/dashboard.png`,
  });
});

async function navigateToFirstVendor(page: import("@playwright/test").Page) {
  await page
    .locator('[data-sidebar="menu-button"]')
    .filter({ hasText: "Vendors" })
    .click();
  await page.waitForURL("**/vendors");
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
  );
  await page.waitForTimeout(2000);
  await page
    .locator(
      `a[href^='/vendors/']:not([href='/vendors/compare']):not([href='/vendors/import']):not([href='/vendors/new']):not([href='/vendors/bulk-send'])`,
    )
    .first()
    .click();
  await page.waitForURL("**/vendors/**");
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
  );
  await page.waitForTimeout(2000);
}

test("capture vendor detail overview screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await navigateToFirstVendor(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/vendor-detail.png`,
  });
});

test("capture vendor detail compliance screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await navigateToFirstVendor(page);
  await page.getByText("Compliance", { exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/vendor-detail-compliance.png`,
  });
});

test("capture vendor detail findings screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await navigateToFirstVendor(page);
  await page.getByText("Findings", { exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/vendor-detail-findings.png`,
  });
});

test("capture assessment review screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page
    .locator('[data-sidebar="menu-button"]')
    .filter({ hasText: "Assessments" })
    .click();
  await page.waitForURL("**/assessments");
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
  );
  await page.getByText("E2E Assessment").click();
  await page.waitForURL("**/assessments/**");
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
  );
  await page.waitForTimeout(2000);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByText("Vendor link (no login required)").first(),
  ).toBeVisible();
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/assessment-review.png`,
  });
});

test("capture template builder screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page
    .locator('[data-sidebar="menu-button"]')
    .filter({ hasText: "Templates" })
    .click();
  await page.waitForURL("**/templates");
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
  );
  await page.getByText("E2E Template").click();
  await page.waitForURL("**/templates/**");
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
  );
  await page.waitForTimeout(2000);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Published templates render read-only previews (no section editor).
  await expect(page.getByText(/This version is published/i)).toBeVisible();
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/template-builder.png`,
  });
});

test("capture settings screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/settings?tab=scoring");
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
  );
  await page.waitForTimeout(2000);
  // CardTitle divs are not real headings; anchor on the form's own control.
  await expect(
    page.getByRole("button", { name: "Save scoring" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/settings.png`,
  });
});
