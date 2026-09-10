import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

// Server-rendered page + route handlers call revalidatePath nowhere here,
// but the settings accessors use React cache() which is a passthrough
// outside RSC — no mock needed.
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  getTrustCenterSettings,
  updateTrustCenterSettings,
} from "@/lib/settings";
import { GET as downloadDocument } from "@/app/api/trust/documents/[id]/route";
import { GET as badgeImage } from "@/app/api/trust/badges/[id]/image/route";

const minimalPdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  "utf8",
);

const minimalPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const PREFIX = "TC-ROUTES";
const settingsBackup: { key: string; value: unknown; isSecret: boolean }[] = [];

async function routeParams(
  handler: (
    request: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>,
  id: string,
): Promise<Response> {
  return handler(new Request(`http://localhost:3000/api/trust/x/${id}`), {
    params: Promise.resolve({ id }),
  });
}

async function cleanup(): Promise<void> {
  await prisma.attachment.deleteMany({
    where: { entityType: "TrustCenterDocument" },
  });
  await prisma.trustCenterBadge.deleteMany({
    where: { title: { startsWith: PREFIX } },
  });
  await prisma.trustCenterDocument.deleteMany({
    where: { title: { startsWith: PREFIX } },
  });
}

beforeAll(async () => {
  await cleanup();
  // Snapshot the trustcenter settings the disabled-state test flips.
  const rows = await prisma.appSetting.findMany({
    where: { category: "trustcenter" },
    select: { key: true, value: true, isSecret: true },
  });
  settingsBackup.push(
    ...rows.map((row) => ({
      key: row.key,
      value: row.value,
      isSecret: row.isSecret,
    })),
  );

  // Enabled baseline for the main tests.
  const current = await getTrustCenterSettings();
  await updateTrustCenterSettings({ ...current, enabled: true });

  // Published document with a stored file.
  const publishedDoc = await prisma.trustCenterDocument.create({
    data: { title: `${PREFIX} published`, category: "POLICY", published: true },
  });
  const publishedKey = "attachment-route-test-published.pdf";
  await storage.save(publishedKey, minimalPdf);
  await prisma.attachment.create({
    data: {
      entityType: "TrustCenterDocument",
      entityId: publishedDoc.id,
      fileName: "published.pdf",
      storageKey: publishedKey,
      mimeType: "application/pdf",
      sizeBytes: minimalPdf.length,
    },
  });

  // Unpublished document (draft) with a stored file.
  const draftDoc = await prisma.trustCenterDocument.create({
    data: { title: `${PREFIX} draft`, category: "POLICY", published: false },
  });
  const draftKey = "attachment-route-test-draft.pdf";
  await storage.save(draftKey, minimalPdf);
  await prisma.attachment.create({
    data: {
      entityType: "TrustCenterDocument",
      entityId: draftDoc.id,
      fileName: "draft.pdf",
      storageKey: draftKey,
      mimeType: "application/pdf",
      sizeBytes: minimalPdf.length,
    },
  });

  // Published badge with a raster image.
  const publishedBadge = await prisma.trustCenterBadge.create({
    data: {
      title: `${PREFIX} badge`,
      published: true,
      imageKey: "trust-badge-route-test.png",
    },
  });
  await storage.save(publishedBadge.imageKey, minimalPng);

  // Published badge WITHOUT an image (imageKey empty).
  await prisma.trustCenterBadge.create({
    data: { title: `${PREFIX} badge no image`, published: true, imageKey: "" },
  });
});

afterAll(async () => {
  await cleanup();
  // Restore trustcenter settings.
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

describe("trust center public routes (integration)", () => {
  it("download serves a published document with correct headers", async () => {
    const document = await prisma.trustCenterDocument.findFirstOrThrow({
      where: { title: `${PREFIX} published` },
    });
    const response = await routeParams(downloadDocument, document.id);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("inline");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const body = await response.arrayBuffer();
    expect(new Uint8Array(body).length).toBe(minimalPdf.length);
  });

  it("download 404s for an unpublished draft", async () => {
    const document = await prisma.trustCenterDocument.findFirstOrThrow({
      where: { title: `${PREFIX} draft` },
    });
    const response = await routeParams(downloadDocument, document.id);
    expect(response.status).toBe(404);
  });

  it("download 404s for an unknown id", async () => {
    const response = await routeParams(downloadDocument, "cmt-nonexistent");
    expect(response.status).toBe(404);
  });

  it("download 404s when the trust center is disabled", async () => {
    const document = await prisma.trustCenterDocument.findFirstOrThrow({
      where: { title: `${PREFIX} published` },
    });
    const current = await getTrustCenterSettings();
    await updateTrustCenterSettings({ ...current, enabled: false });

    const response = await routeParams(downloadDocument, document.id);
    expect(response.status).toBe(404);

    // Re-enable for the remaining tests.
    await updateTrustCenterSettings({ ...current, enabled: true });
  });

  it("badge image serves published raster images with cache headers", async () => {
    const badge = await prisma.trustCenterBadge.findFirstOrThrow({
      where: { title: `${PREFIX} badge` },
    });
    const response = await routeParams(badgeImage, badge.id);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toContain("public");
  });

  it("badge image 404s for a published badge without an image", async () => {
    const badge = await prisma.trustCenterBadge.findFirstOrThrow({
      where: { title: `${PREFIX} badge no image` },
    });
    const response = await routeParams(badgeImage, badge.id);
    expect(response.status).toBe(404);
  });

  it("badge image 404s for an unknown id", async () => {
    const response = await routeParams(badgeImage, "cmt-nonexistent");
    expect(response.status).toBe(404);
  });
});
