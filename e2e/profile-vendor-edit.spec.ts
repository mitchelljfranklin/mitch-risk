import { expect, test } from "@playwright/test";

import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";
import { prisma } from "@/lib/prisma";

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function signInAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

test("profile save shows its success toast in production", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/profile");

  // Verifying the current password with no other change still returns a success
  // state — the toast must fire even though updateProfileAction no longer
  // revalidates its own /profile route.
  await page.getByLabel("Current password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible({
    timeout: 15000,
  });
});

test("vendor edit shows its success toast in production", async ({ page }) => {
  await signInAsAdmin(page);
  const vendor = await prisma.vendor.findFirstOrThrow({
    where: { name: "E2E Vendor" },
    select: { id: true },
  });
  await page.goto(`/vendors/${vendor.id}/edit`);

  await page.getByLabel("Vendor name").fill("E2E Vendor");
  await page.getByRole("button", { name: "Save vendor" }).click();
  await expect(page.getByText("Vendor updated.")).toBeVisible({
    timeout: 15000,
  });
});
