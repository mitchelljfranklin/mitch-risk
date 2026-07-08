import { test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

const SCREENSHOT_DIR = "docs/screenshots";

test.use({ viewport: { width: 1280, height: 800 } });

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

test("capture dashboard screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
  );
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/dashboard.png`,
  });
});

test("capture vendor detail screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page.locator('[data-sidebar="menu-button"]').filter({ hasText: "Vendors" }).click();
  await page.waitForURL("**/vendors");
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
  );
  await page
    .getByRole("link")
    .filter({ hasText: "Demo AgileFort" })
    .first()
    .click();
  await page.waitForURL("**/vendors/**");
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Loading..."),
  );
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/vendor-detail.png`,
  });
});

test("capture assessment review screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page.locator('[data-sidebar="menu-button"]').filter({ hasText: "Assessments" }).click();
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
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/assessment-review.png`,
  });
});

test("capture template builder screenshot", async ({ page }) => {
  await signInAsAdmin(page);
  await page.locator('[data-sidebar="menu-button"]').filter({ hasText: "Templates" }).click();
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
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/settings.png`,
  });
});
