import { expect, test } from "@playwright/test";

import { createUser } from "@/lib/db/users";
import { prisma } from "@/lib/prisma";

import { signInAsAdmin } from "./helpers";

// This spec mutates app_settings, so it refuses to run against anything but
// a dedicated test database - same guard philosophy as vitest.setup.ts.
const databaseUrl = process.env.DATABASE_URL ?? "";
const IS_TEST_DB = /test/i.test(databaseUrl);
test.skip(
  !IS_TEST_DB,
  "settings-hardening mutates app_settings; run it against a *test* database.",
);

type AppSettingSnapshot = {
  id: string;
  category: string;
  key: string;
  value: unknown;
  isSecret: boolean;
};

let settingsSnapshot: AppSettingSnapshot[] = [];

async function restoreSettings(): Promise<void> {
  await prisma.$transaction([
    prisma.appSetting.deleteMany({}),
    prisma.appSetting.createMany({
      data: settingsSnapshot.map((setting) => ({
        id: setting.id,
        category: setting.category,
        key: setting.key,
        value: setting.value as never,
        isSecret: setting.isSecret,
      })),
    }),
  ]);
}

test.beforeAll(async () => {
  settingsSnapshot = await prisma.appSetting.findMany({
    select: {
      id: true,
      category: true,
      key: true,
      value: true,
      isSecret: true,
    },
  });
});

test.afterAll(async () => {
  await restoreSettings();
  await prisma.$disconnect();
});

const E2E_VENDOR_NAME = "E2E Vendor";

function uniqueSuffix(): string {
  return Date.now().toString();
}

test.describe("settings hardening regression", () => {
  test("storage secrets never reach the browser payload", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/settings?tab=storage");

    const secret = "S3CR3T-e2e-0123456789-abcdef";
    await page.getByLabel("Bucket").fill("e2e-bucket");
    await page.getByLabel("Access key ID").fill("AKIA-E2E");
    await page.getByLabel("Secret access key").fill(secret);
    await page.getByRole("button", { name: "Save storage settings" }).click();
    await expect(page.getByText("Storage settings saved.")).toBeVisible({
      timeout: 15000,
    });

    // Reload and inspect the actual HTML payload for the secret string.
    let documentBody = "";
    page.on("response", (response) => {
      if (
        response.url().includes("/settings") &&
        response.request().method() === "GET"
      ) {
        response
          .text()
          .then((text) => {
            if (text.includes("<html")) documentBody = text;
          })
          .catch(() => {
            // unreadable streams are covered by the final payload assert
          });
      }
    });
    await page.reload();
    await expect(page.locator('input[name="s3SecretAccessKey"]')).toBeVisible();

    // The configured secret must not appear anywhere in the served payload,
    // while its presence indicator (dots placeholder) must render.
    expect(documentBody).not.toContain(secret);
    await expect(
      page.locator('input[name="s3SecretAccessKey"]'),
    ).toHaveAttribute("placeholder", "········");

    // Blank re-save keeps the existing value: the configured indicator stays.
    await page.getByRole("button", { name: "Save storage settings" }).click();
    await expect(page.getByText("Storage settings saved.")).toBeVisible();
    await page.reload();
    await expect(
      page.locator('input[name="s3SecretAccessKey"]'),
    ).toHaveAttribute("placeholder", "········");
  });

  test("webhook create rejects non-HTTPS, internal and malformed targets", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/settings?tab=webhooks");

    const openForm = async () => {
      if ((await page.locator("#webhookName").count()) === 0) {
        await page.getByRole("button", { name: "Add endpoint" }).click();
      }
      await page
        .locator("#webhookName")
        .waitFor({ state: "visible", timeout: 10000 });
    };

    const endpointCountHeading = () =>
      page.getByRole("heading", { name: /Webhook endpoints \(\d+\)/ });

    const cases: { url: string; expected: RegExp }[] = [
      { url: "http://hooks.example.test/hook", expected: /HTTPS/i },
      { url: "https://localhost/hook", expected: /public address/i },
      { url: "https://192.168.1.5/hook", expected: /public address/i },
      { url: "https://169.254.169.254/meta", expected: /public address/i },
    ];

    // Sweep pre-existing e2e cleanup leftovers from earlier failed runs so
    // the persisted-count assertions below are deterministic. The Delete
    // trigger lives in the same row container as the endpoint URL.
    const deleteTriggerFor = (url: string) =>
      page
        .getByText(url)
        .locator("xpath=ancestor::div[.//button][1]")
        .getByRole("button", { name: "Delete" });

    for (let sweep = 0; sweep < 5; sweep++) {
      if ((await page.getByText("hooks.example.test/valid").count()) === 0) {
        break;
      }
      await deleteTriggerFor("hooks.example.test/valid").click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete" })
        .click();
      await page.waitForTimeout(1500);
    }
    await expect(page.getByText("hooks.example.test/valid")).toHaveCount(0, {
      timeout: 20000,
    });

    const countBefore = Number(
      ((await endpointCountHeading().innerText()).match(/\((\d+)\)/) ?? [
        "",
        "0",
      ])[1],
    );

    for (const testCase of cases) {
      await openForm();
      await page.locator("#webhookName").fill(`E2E webhook ${uniqueSuffix()}`);
      await page.locator("#webhookUrl").fill(testCase.url);
      await page.getByRole("button", { name: "Create" }).click();
      // Persisted outcome, not a toast race: the endpoint list must not grow.
      await expect(endpointCountHeading()).toHaveText(
        `Webhook endpoints (${countBefore})`,
        { timeout: 10000 },
      );
    }

    // Happy path survives so validation did not break the form itself.
    await openForm();
    const validName = `E2E valid webhook ${uniqueSuffix()}`;
    await page.locator("#webhookName").fill(validName);
    await page.locator("#webhookUrl").fill("https://hooks.example.test/valid");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(endpointCountHeading()).toHaveText(
      `Webhook endpoints (${countBefore + 1})`,
      { timeout: 15000 },
    );

    // Clean up via the per-endpoint delete form (ConfirmDialog confirm).
    await deleteTriggerFor("hooks.example.test/valid").click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(endpointCountHeading()).toHaveText(
      `Webhook endpoints (${countBefore})`,
      { timeout: 20000 },
    );
  });

  test("CSV import updates require vendor edit permission", async ({
    browser,
  }) => {
    const suffix = uniqueSuffix();
    const creatorRole = await prisma.role.create({
      data: {
        name: `E2E Creator ${suffix}`,
        description: "create-only",
        permissions: ["vendors:create", "profile:view"],
      },
    });
    await prisma.user.create({
      data: {
        name: "E2E Creator",
        email: `e2e-creator-${suffix}@example.test`,
        passwordHash: "import-only",
        roleId: creatorRole.id,
      },
    });
    // Login-usable account: createUser bcrypt-hashes the plaintext password.
    await createUser({
      name: "E2E Creator Login",
      email: `e2e-creator-login-${suffix}@example.test`,
      password: "creator-password-12345",
      roleId: creatorRole.id,
    });

    const existingVendor = await prisma.vendor.findFirstOrThrow({
      where: { name: E2E_VENDOR_NAME },
      select: { id: true, name: true },
    });

    const csv = [
      "id,name,contactemail",
      `${existingVendor.id},HACKED-VIA-IMPORT,hacked@example.test`,
    ].join("\n");

    try {
      const creatorContext = await browser.newContext();
      const creatorPage = await creatorContext.newPage();
      await creatorPage.goto("/login");
      await creatorPage
        .getByLabel("Email")
        .fill(`e2e-creator-login-${suffix}@example.test`);
      await creatorPage.getByLabel("Password").fill("creator-password-12345");
      await creatorPage.getByRole("button", { name: "Sign in" }).click();
      await creatorPage.waitForURL("**/dashboard");

      await creatorPage.goto("/vendors/import");
      await creatorPage.locator('input[type="file"]').setInputFiles({
        name: "sabotage.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv, "utf8"),
      });
      // Two-step wizard: preview then confirm.
      await creatorPage.getByRole("button", { name: "Next" }).click();
      await creatorPage.getByRole("button", { name: "Import vendors" }).click();

      await expect(
        creatorPage
          .getByText(/Updating requires vendor edit permission/i)
          .first(),
      ).toBeVisible({ timeout: 15000 });

      const after = await prisma.vendor.findUniqueOrThrow({
        where: { id: existingVendor.id },
        select: { name: true },
      });
      expect(after.name).toBe(existingVendor.name);
      await creatorContext.close();
    } finally {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: [
              `e2e-creator-${suffix}@example.test`,
              `e2e-creator-login-${suffix}@example.test`,
            ],
          },
        },
      });
      await prisma.role.deleteMany({ where: { id: creatorRole.id } });
    }
  });

  test("reset emails are single-use and cannot be retried", async ({
    page,
  }) => {
    const marker = `reset-single-use-${uniqueSuffix()}@example.test`;
    await prisma.notificationLog.create({
      data: {
        type: "RESET",
        sentTo: marker,
        subject: "Password reset",
        status: "FAILED",
        errorMessage: "smtp relay down",
      },
    });

    await signInAsAdmin(page);
    await page.goto("/settings?tab=email-tracking");
    const row = page.locator("tr", { hasText: marker });
    await expect(row).toBeVisible();
    await expect(row.getByRole("button", { name: "Retry" })).toHaveCount(0);
  });

  test("served OpenAPI spec keeps the /api base path", async ({ page }) => {
    await signInAsAdmin(page);
    const response = await page.request.get("/api/docs");
    expect(response.status()).toBe(200);
    const spec = (await response.json()) as { servers: { url: string }[] };
    expect(spec.servers[0]?.url.endsWith("/api")).toBe(true);
  });

  test("deleting a role that still has users surfaces an error toast", async ({
    page,
  }) => {
    const suffix = uniqueSuffix();
    const role = await prisma.role.create({
      data: {
        name: `E2E Fragile ${suffix}`,
        description: "",
        permissions: ["profile:view"],
      },
    });
    await prisma.user.create({
      data: {
        name: "E2E Fragile User",
        email: `fragile-${suffix}@example.test`,
        passwordHash: "x",
        roleId: role.id,
      },
    });

    await signInAsAdmin(page);
    await page.goto("/settings?tab=roles");

    // Each role renders its own delete form keyed by role id.
    const deleteForm = page.locator(`form#delete-role-${role.id}`);
    await deleteForm.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete" }).last().click();

    await expect(
      page.getByText(/Could not delete the role/i).first(),
    ).toBeVisible({ timeout: 15000 });

    await prisma.user.deleteMany({
      where: { email: `fragile-${suffix}@example.test` },
    });
    await prisma.role.deleteMany({ where: { id: role.id } });
  });

  test("limits and scheduling values persist across reloads", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await page.goto("/settings?tab=limits");
    await page.getByLabel("Audit log retention (days)").fill("45");
    await page.getByLabel("Email log retention (days)").fill("10");
    await page.getByRole("button", { name: "Save limits" }).click();
    await expect(page.getByText("Configuration saved.")).toBeVisible({
      timeout: 15000,
    });

    await page.reload();
    await expect(page.getByLabel("Audit log retention (days)")).toHaveValue(
      "45",
    );
    await expect(page.getByLabel("Email log retention (days)")).toHaveValue(
      "10",
    );

    // The scheduling tab's toggle must be untouched by a limits save.
    await page.goto("/settings?tab=scheduling");
    await expect(
      page.getByRole("checkbox", { name: "Run scheduled jobs inside the app" }),
    ).toBeChecked();
  });

  test("scoring tab has no exclude-N/A control and saves cleanly", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/settings?tab=scoring");

    await expect(page.getByText(/Exclude/i)).toHaveCount(0);
    await page.getByRole("button", { name: "Save scoring" }).click();
    await expect(page.getByText("Scoring settings saved.")).toBeVisible({
      timeout: 15000,
    });
  });

  test("email preview renders for authenticated admins", async ({ page }) => {
    await signInAsAdmin(page);
    const response = await page.request.get(
      "/api/settings/email-preview?templateType=invite",
    );
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Acme Logistics");
  });
});
