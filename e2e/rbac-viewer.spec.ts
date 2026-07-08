import { expect, test } from "@playwright/test";

import { E2E_VIEWER_EMAIL, E2E_VIEWER_PASSWORD } from "./global-setup";

async function signInAsViewer(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_VIEWER_EMAIL);
  await page.getByLabel("Password").fill(E2E_VIEWER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
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
    await page.goto("/vendors");
    await page.waitForTimeout(2000);
    await page.locator("table a[href^='/vendors/']").first().click();
    await page.waitForURL("**/vendors/**");
    await page.waitForTimeout(2000);

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
});
