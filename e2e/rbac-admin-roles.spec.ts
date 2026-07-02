import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";
import { prisma } from "@/lib/prisma";

const ROLE_PREFIX = "E2E Custom Role";
const roleName = `${ROLE_PREFIX} ${Date.now()}`;

test.afterAll(async () => {
  await prisma.role.deleteMany({
    where: { name: { startsWith: ROLE_PREFIX } },
  });
  await prisma.$disconnect();
});

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

test("admin creates a custom role via the slide-over with select-all", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/settings?tab=roles");

  await expect(page.getByRole("button", { name: "New role" })).toBeVisible();

  await page.getByRole("button", { name: "New role" }).click();
  await expect(page.getByLabel("Name")).toBeVisible();

  await page.getByLabel("Name").fill(roleName);
  await page.getByLabel("Select all permissions").click();
  await page.getByRole("button", { name: "Create role" }).click();

  await expect(page.getByText(roleName)).toBeVisible({ timeout: 15000 });
});

test("dashboard stat cards render real (non-zero) counts", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/dashboard");

  const card = page
    .locator("div")
    .filter({ hasText: /^Vendors tracked/ })
    .last();
  await expect(card).toBeVisible();
  // The count-up must settle on the real value, not stay at 0.
  await expect(card).not.toHaveText(/Vendors tracked\s*0$/);
});
