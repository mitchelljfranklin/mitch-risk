import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";
import { prisma } from "@/lib/prisma";

const NEW_USER_EMAIL = `e2e-created-${Date.now()}@example.test`;

test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: NEW_USER_EMAIL } });
  await prisma.$disconnect();
});

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

test("admin creates a user: modal closes and the row appears (prod)", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/settings?tab=users");

  await page.getByRole("button", { name: "New user" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Name")).toBeVisible();

  await dialog.getByLabel("Name").fill("E2E Created User");
  await dialog.getByLabel("Email").fill(NEW_USER_EMAIL);
  await dialog.getByLabel("Password").fill("create-user-password-123");
  await dialog.getByRole("button", { name: "Create user" }).click();

  // The modal must auto-close (state.ok effect) and the new user must appear
  // after the client refresh — both broke in production before the migration.
  await expect(dialog).toBeHidden({ timeout: 15000 });
  await expect(page.getByText(NEW_USER_EMAIL)).toBeVisible({ timeout: 15000 });
});
