import { type Page } from "@playwright/test";

import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_REVIEWER_EMAIL,
  E2E_REVIEWER_PASSWORD,
  E2E_VIEWER_EMAIL,
  E2E_VIEWER_PASSWORD,
} from "./global-setup";

// Shared sign-in helpers - previously copy-pasted into every spec, which
// drifted (different wait strategies) and made helper extraction impossible.

async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

export function signInAsAdmin(page: Page): Promise<void> {
  return signIn(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
}

export function signInAsViewer(page: Page): Promise<void> {
  return signIn(page, E2E_VIEWER_EMAIL, E2E_VIEWER_PASSWORD);
}

export function signInAsReviewer(page: Page): Promise<void> {
  return signIn(page, E2E_REVIEWER_EMAIL, E2E_REVIEWER_PASSWORD);
}

// Vendor detail navigation that works in both rows and cards list views,
// skipping utility routes (compare/import/new/bulk-send).
export async function openFirstVendor(page: Page): Promise<void> {
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
