import { expect, test } from "@playwright/test";

import { signInAsAdmin } from "./helpers";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

test("a settings toggle keeps its new state after saving (no reload)", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/settings?tab=api");

  const toggle = page.getByRole("checkbox", {
    name: "Enable API key authentication",
  });
  await expect(toggle).toBeVisible();

  const startedChecked = await toggle.isChecked();

  // Flip the toggle and save.
  await toggle.click();
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("API settings saved.")).toBeVisible({
    timeout: 15000,
  });

  // Regression: the toggle must reflect the saved value without a reload,
  // rather than snapping back to its mount-time state (React 19 form reset +
  // Radix reset listener).
  if (startedChecked) {
    await expect(toggle).not.toBeChecked();
  } else {
    await expect(toggle).toBeChecked();
  }

  // Restore the original state so the run is idempotent.
  await toggle.click();
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("API settings saved.")).toBeVisible({
    timeout: 15000,
  });
});

test("a settings-tab save shows its success toast in production", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/settings?tab=scoring");

  // Scoring is a plain save form migrated to useActionFeedback: saving must show
  // the toast even though the action no longer revalidates the current route.
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("Scoring settings saved.")).toBeVisible({
    timeout: 15000,
  });
});

test("the built-in scheduler toggle persists its state after saving", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/settings?tab=scheduling");

  const toggle = page.getByRole("checkbox", {
    name: "Run scheduled jobs inside the app",
  });
  await expect(toggle).toBeVisible();

  const startedChecked = await toggle.isChecked();

  await toggle.click();
  await page.getByRole("button", { name: "Save scheduling" }).click();
  await expect(page.getByText("Configuration saved.")).toBeVisible({
    timeout: 15000,
  });

  if (startedChecked) {
    await expect(toggle).not.toBeChecked();
  } else {
    await expect(toggle).toBeChecked();
  }

  // Restore so internal scheduling behaviour stays enabled after the run.
  await toggle.click();
  await page.getByRole("button", { name: "Save scheduling" }).click();
  await expect(page.getByText("Configuration saved.")).toBeVisible({
    timeout: 15000,
  });
});
