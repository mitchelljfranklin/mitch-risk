import { expect, test } from "@playwright/test";

import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  getTrustCenterSettings,
  updateTrustCenterSettings,
} from "@/lib/settings";

import { signInAsAdmin, signInAsViewer } from "./helpers";

const BADGE_TITLE = "E2E TC Badge";
const SECTION_TITLE = "E2E TC Section";
const DOCUMENT_TITLE = "E2E TC Document";
const SUBPROCESSOR_NAME = "E2E TC Subprocessor";

const minimalPdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  "utf8",
);

const minimalPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

// Trust center content is global state; snapshot the settings category so
// the enable/disable cycles restore whatever the database had before.
type SettingRow = { key: string; value: unknown; isSecret: boolean };
let settingsBackup: SettingRow[] = [];

async function cleanupContent(): Promise<void> {
  const badges = await prisma.trustCenterBadge.findMany({
    where: { title: { startsWith: "E2E TC" } },
  });
  for (const badge of badges) {
    if (badge.imageKey) {
      await storage.delete(badge.imageKey).catch(() => {
        // file already gone
      });
    }
  }
  const documents = await prisma.trustCenterDocument.findMany({
    where: { title: { startsWith: "E2E TC" } },
  });
  for (const document of documents) {
    const attachments = await prisma.attachment.findMany({
      where: { entityType: "TrustCenterDocument", entityId: document.id },
    });
    for (const attachment of attachments) {
      await storage.delete(attachment.storageKey).catch(() => {
        // file already gone
      });
    }
  }
  await prisma.attachment.deleteMany({
    where: { entityType: "TrustCenterDocument" },
  });
  await prisma.trustCenterBadge.deleteMany({
    where: { title: { startsWith: "E2E TC" } },
  });
  await prisma.trustCenterDocument.deleteMany({
    where: { title: { startsWith: "E2E TC" } },
  });
  await prisma.trustCenterSection.deleteMany({
    where: { title: { startsWith: "E2E TC" } },
  });
  await prisma.trustCenterSubprocessor.deleteMany({
    where: { name: { startsWith: "E2E TC" } },
  });
}

test.beforeAll(async () => {
  await cleanupContent();
  const rows = await prisma.appSetting.findMany({
    where: { category: "trustcenter" },
    select: { key: true, value: true, isSecret: true },
  });
  settingsBackup = rows.map((row) => ({
    key: row.key,
    value: row.value,
    isSecret: row.isSecret,
  }));
});

test.afterAll(async () => {
  await cleanupContent();
  await prisma.appSetting.deleteMany({ where: { category: "trustcenter" } });
  if (settingsBackup.length > 0) {
    await prisma.appSetting.createMany({
      data: settingsBackup.map((row) => ({
        key: row.key,
        value: row.value as never,
        isSecret: row.isSecret,
        category: "trustcenter",
      })),
    });
  }
  await prisma.$disconnect();
});

async function enableTrustCenter(): Promise<void> {
  const current = await getTrustCenterSettings();
  await updateTrustCenterSettings({ ...current, enabled: true });
}

test.describe.serial("trust center journeys", () => {
  test("admin curates content through the manager", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/trust-center");

    // Badge with image upload.
    await page.getByRole("button", { name: "Add badge" }).click();
    await page.locator("#badge-title").fill(BADGE_TITLE);
    await page.locator("#badge-issuer").fill("E2E Issuer");
    await page.locator("#badge-image").setInputFiles({
      name: "badge.png",
      mimeType: "image/png",
      buffer: minimalPng,
    });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Badge saved.")).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText(BADGE_TITLE).first()).toBeVisible();

    // Document with PDF upload (two-step stays in one sheet).
    await page.getByRole("button", { name: "Add document" }).click();
    await page.locator("#document-title").fill(DOCUMENT_TITLE);
    await page.locator("#document-category").click();
    const categoryListbox = page.getByRole("listbox");
    await categoryListbox.waitFor({ state: "visible", timeout: 5000 });
    await categoryListbox.getByRole("option", { name: "Policy" }).click();
    await page.locator("#document-file").setInputFiles({
      name: "policy.pdf",
      mimeType: "application/pdf",
      buffer: minimalPdf,
    });
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Document saved.")).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText(DOCUMENT_TITLE).first()).toBeVisible();

    // Subprocessor.
    await page.getByRole("button", { name: "Add subprocessor" }).click();
    await page.locator("#subprocessor-name").fill(SUBPROCESSOR_NAME);
    await page.locator("#subprocessor-purpose").fill("Cloud hosting");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Subprocessor saved.")).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText(SUBPROCESSOR_NAME).first()).toBeVisible();

    // Section.
    await page.getByRole("button", { name: "Add section" }).click();
    await page.locator("#section-title").fill(SECTION_TITLE);
    await page
      .locator("#section-body")
      .fill("Our **security** commitment statement.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Section saved.")).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText(SECTION_TITLE).first()).toBeVisible();
  });

  test("public page renders published content and documents download", async ({
    page,
  }) => {
    await enableTrustCenter();
    const response = await page.goto("/trust");
    expect(response?.status()).toBe(200);

    const badgeCount = await prisma.trustCenterBadge.count({
      where: { title: BADGE_TITLE },
    });
    expect(badgeCount).toBe(1);

    await expect(page.getByText(BADGE_TITLE).first()).toBeVisible();
    await expect(page.getByText(SECTION_TITLE).first()).toBeVisible();
    await expect(page.getByText(SUBPROCESSOR_NAME).first()).toBeVisible();
    await expect(
      page.getByRole("img", { name: `${BADGE_TITLE} badge` }),
    ).toBeVisible();

    // Document download: the journey creates exactly one published document,
    // so the single Download link is its own row anchor.
    const downloadLink = page.getByRole("link", { name: "Download" });
    await expect(downloadLink).toBeVisible({ timeout: 15000 });
    const downloadHref = await downloadLink.getAttribute("href");
    expect(downloadHref).toBeTruthy();
    const download = await page.request.get(
      `http://localhost:3000${downloadHref}`,
    );
    expect(download.status()).toBe(200);
    expect(download.headers()["content-type"]).toBe("application/pdf");
  });

  test("disabling hides the public page and its files behind a 404", async ({
    page,
  }) => {
    const current = await getTrustCenterSettings();
    await updateTrustCenterSettings({ ...current, enabled: false });

    const response = await page.goto("/trust");
    expect(response?.status()).toBe(404);

    // Documents follow the same gate.
    const document = await prisma.trustCenterDocument.findFirstOrThrow({
      where: { title: DOCUMENT_TITLE },
    });
    const fileResponse = await page.request.get(
      `/api/trust/documents/${document.id}`,
    );
    expect(fileResponse.status()).toBe(404);

    // Re-enable for later tests / restore.
    await updateTrustCenterSettings({ ...current, enabled: true });
    const restored = await page.goto("/trust");
    expect(restored?.status()).toBe(200);
  });

  test("viewer role cannot reach the manager", async ({ page }) => {
    await signInAsViewer(page);

    // Sidebar hides the item entirely.
    await expect(page.getByRole("link", { name: "Trust center" })).toHaveCount(
      0,
    );

    // Direct navigation redirects to the dashboard.
    await page.goto("/trust-center");
    await page.waitForURL("**/dashboard");
    await expect(
      page.getByRole("heading", { name: "Vendor risk overview" }),
    ).toBeVisible();
  });

  test("manager deletes clean up through the UI", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/trust-center");

    // Each journey item exists exactly once (test 1 creates one of each), so
    // the aria-labeled delete buttons resolve uniquely without row scoping.
    const deleteViaDialog = async (label: string, text: string) => {
      await page.getByRole("button", { name: `Delete ${label}` }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete" })
        .click();
      await expect(page.getByText(text)).toHaveCount(0, { timeout: 15000 });
    };

    // Badge delete via ConfirmDialog (form-wired submit).
    await deleteViaDialog(BADGE_TITLE, BADGE_TITLE);

    // Section delete.
    await deleteViaDialog(SECTION_TITLE, SECTION_TITLE);

    // Document delete via ConfirmDialog.
    await deleteViaDialog(DOCUMENT_TITLE, DOCUMENT_TITLE);

    // Subprocessor delete.
    await deleteViaDialog(SUBPROCESSOR_NAME, SUBPROCESSOR_NAME);

    // Storage verification for the deleted document's file: the attachment
    // was created by this spec, so its file must now be gone.
    const remaining = await prisma.attachment.findMany({
      where: { entityType: "TrustCenterDocument" },
    });
    for (const attachment of remaining) {
      await expect(storage.read(attachment.storageKey)).rejects.toThrow();
    }
  });
});
