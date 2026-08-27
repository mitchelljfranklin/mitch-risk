import { expect, test } from "@playwright/test";

import { E2E_VIEWER_EMAIL, E2E_VIEWER_PASSWORD } from "./global-setup";

async function signInAsViewer(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_VIEWER_EMAIL);
  await page.getByLabel("Password").fill(E2E_VIEWER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

// Works in both rows and cards list views, and skips utility routes.
async function openFirstVendor(page: import("@playwright/test").Page) {
  await page.goto("/vendors");
  const link = page
    .locator(
      `a[href^='/vendors/']:not([href='/vendors/compare']):not([href='/vendors/import']):not([href='/vendors/new']):not([href='/vendors/bulk-send'])`,
    )
    .first();
  await link.waitFor({ state: "visible", timeout: 15000 });
  await link.click();
  await page.waitForURL("**/vendors/**", { timeout: 15000 });
}

test.describe("Viewer role sees a read-only UI", () => {
  test("dashboard hides the New vendor quick action", async ({ page }) => {
    await signInAsViewer(page);
    await expect(
      page.getByRole("heading", { name: "Vendor risk overview" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "New vendor" })).toHaveCount(0);
  });

  test("sidebar hides Settings for a viewer", async ({ page }) => {
    await signInAsViewer(page);
    await expect(page.getByRole("link", { name: "Vendors" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
  });

  test("vendors list hides create/import/bulk controls but shows vendors", async ({
    page,
  }) => {
    await signInAsViewer(page);
    await page.goto("/vendors");
    await page.waitForTimeout(2000);
    await expect(page.getByRole("heading", { name: "Vendors" })).toBeVisible();
    await expect(page.getByText("E2E Vendor")).toBeVisible();
    await expect(page.getByRole("link", { name: "New vendor" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Bulk send" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Import" })).toHaveCount(0);
  });

  test("vendor detail hides edit/delete/new-assessment but keeps export", async ({
    page,
  }) => {
    await signInAsViewer(page);
    await openFirstVendor(page);
    await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "New assessment" }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Export CSV" })).toBeVisible();
  });

  test("templates list hides New template for a viewer", async ({ page }) => {
    await signInAsViewer(page);
    await page.goto("/templates");
    await expect(
      page.getByRole("heading", { name: "Templates" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "New template" })).toHaveCount(
      0,
    );
  });

  test("risk register hides the bulk-findings toolbar and row checkboxes", async ({
    page,
  }) => {
    await signInAsViewer(page);
    await page.goto("/risk-register");
    await expect(
      page.getByRole("heading", { name: "Risk register" }),
    ).toBeVisible();
    // Selection checkboxes only render for reviewers.
    await expect(page.locator('[role="checkbox"]')).toHaveCount(0);
    await expect(page.getByText(/selected$/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Apply" })).toHaveCount(0);
  });

  test("frameworks hide import/delete controls but keep export and detail views", async ({
    page,
  }) => {
    await signInAsViewer(page);
    await page.goto("/frameworks");
    await expect(
      page.getByRole("heading", { name: "Frameworks" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Import" })).toHaveCount(0);

    const frameworkLink = page.locator("table a[href^='/frameworks/']").first();
    if ((await frameworkLink.count()) > 0) {
      await frameworkLink.click();
      await page.waitForURL("**/frameworks/**");
      await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "Export CSV" }),
      ).toBeVisible();
    }
  });

  test("certifications manager hides add/remove certification controls", async ({
    page,
  }) => {
    await signInAsViewer(page);
    await openFirstVendor(page);

    // The certifications manager renders read-only rows on the overview but
    // none of the write controls ("Add certification" button / editor).
    await expect(
      page.getByRole("button", { name: "Add certification" }),
    ).toHaveCount(0);
  });
});
