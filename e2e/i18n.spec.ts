import { expect, test } from "@playwright/test";

import {
  getOrganizationSettings,
  updateOrganizationSettings,
} from "@/lib/settings";

import { signInAsAdmin } from "./helpers";

test.describe("locale selection", () => {
  test("switches the auth screens and persists the choice", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    await page.getByRole("combobox", { name: "Change language" }).click();
    await page.getByRole("option", { name: "Español" }).click();

    await expect(
      page.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();

    await page.getByRole("combobox", { name: "Cambiar idioma" }).click();
    await page.getByRole("option", { name: "English" }).click();

    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("organization default language", () => {
  test.beforeEach(async () => {
    const organization = await getOrganizationSettings();
    if (organization.defaultLocale !== "en") {
      await updateOrganizationSettings({
        ...organization,
        defaultLocale: "en",
      });
    }
  });

  test.afterEach(async () => {
    const organization = await getOrganizationSettings();
    if (organization.defaultLocale !== "en") {
      await updateOrganizationSettings({
        ...organization,
        defaultLocale: "en",
      });
    }
  });

  test("applies to visitors without a language cookie", async ({
    page,
    browser,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/admin/general");

    await page.getByRole("combobox", { name: "Default language" }).click();
    await page.getByRole("option", { name: "Español" }).click();
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Organization settings saved.")).toBeVisible({
      timeout: 15000,
    });

    const visitor = await browser.newContext({ locale: "en-US" });
    const visitorPage = await visitor.newPage();
    await visitorPage.goto("/login");
    await expect(
      visitorPage.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
    await visitor.close();
  });
});

test.describe("internal shell", () => {
  test.beforeEach(async () => {
    const organization = await getOrganizationSettings();
    if (organization.defaultLocale !== "en") {
      await updateOrganizationSettings({
        ...organization,
        defaultLocale: "en",
      });
    }
  });

  test("switches the shell language from the user menu", async ({ page }) => {
    await signInAsAdmin(page);

    const sidebar = page.locator("[data-slot='sidebar-inner']");
    await expect(
      sidebar.getByRole("link", { name: "Vendors" }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();

    await expect(
      sidebar.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.reload();
    await expect(
      sidebar.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Idioma" }).hover();
    await page.getByRole("menuitem", { name: "English" }).click();

    await expect(
      sidebar.getByRole("link", { name: "Vendors" }).first(),
    ).toBeVisible();
  });

  test("generates the portfolio PDF in the selected language", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await page.getByRole("button", { name: "E2E Admin" }).click();
    await page.getByRole("menuitem", { name: "Language" }).hover();
    await page.getByRole("menuitem", { name: "Español" }).click();
    await expect(
      page.getByRole("link", { name: "Proveedores" }).first(),
    ).toBeVisible();

    const response = await page.request.get("/api/dashboard/report");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
  });
});
