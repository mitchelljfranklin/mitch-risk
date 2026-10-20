import { expect, test } from "@playwright/test";

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
