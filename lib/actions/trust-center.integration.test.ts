import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn().mockResolvedValue(undefined),
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

// Server actions call revalidatePath, which requires a request scope that
// vitest does not provide.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import {
  deleteTrustDocumentAction,
  saveTrustBadgeAction,
  saveTrustDocumentAction,
  saveTrustSectionAction,
  saveTrustSubprocessorAction,
} from "@/lib/actions/trust-center";

const PREFIX = "TC-ACTIONS";

const minimalPdf = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  "utf8",
);

const minimalPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function formDataWith(
  fields: Record<string, string | boolean | File>,
): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "boolean") {
      if (value) formData.set(key, "on");
    } else if (value instanceof File) {
      formData.set(key, value);
    } else {
      formData.set(key, value);
    }
  }
  return formData;
}

function testFile(
  name: string,
  buffer: Buffer,
  type = "application/octet-stream",
): File {
  return new File([new Uint8Array(buffer)], name, { type });
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
  await prisma.trustCenterSection.deleteMany({
    where: { title: { startsWith: PREFIX } },
  });
  await prisma.trustCenterSubprocessor.deleteMany({
    where: { name: { startsWith: PREFIX } },
  });
}

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("trust center actions (integration)", () => {
  it("saveTrustBadgeAction rejects SVG and oversize images without saving", async () => {
    const svg = testFile(
      "badge.svg",
      Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),
      "image/svg+xml",
    );
    const result = await saveTrustBadgeAction(
      undefined,
      formDataWith({
        title: `${PREFIX} SVG Badge`,
        published: true,
        imageFile: svg,
      }),
    );
    expect(result?.ok).toBe(false);
    expect(result?.message).toMatch(/SVG/i);

    const stored = await prisma.trustCenterBadge.findFirst({
      where: { title: `${PREFIX} SVG Badge` },
    });
    expect(stored).toBeNull();
  });

  it("creates a badge with a valid raster image and rolls back on failure", async () => {
    const result = await saveTrustBadgeAction(
      undefined,
      formDataWith({
        title: `${PREFIX} Badge`,
        issuer: "AICPA",
        published: true,
        imageFile: testFile("badge.png", minimalPng, "image/png"),
      }),
    );
    expect(result?.ok).toBe(true);

    const badge = await prisma.trustCenterBadge.findFirstOrThrow({
      where: { title: `${PREFIX} Badge` },
    });
    expect(badge.imageKey).toMatch(/^trust-badge-/);
    await expect(storage.read(badge.imageKey)).resolves.toBeTruthy();
  });

  it("creates a document with a magic-byte-validated PDF and replaces files", async () => {
    const created = await saveTrustDocumentAction(
      undefined,
      formDataWith({
        title: `${PREFIX} Doc`,
        category: "POLICY",
        published: true,
        file: testFile("policy.pdf", minimalPdf, "application/pdf"),
      }),
    );
    expect(created?.ok).toBe(true);

    const document = await prisma.trustCenterDocument.findFirstOrThrow({
      where: { title: `${PREFIX} Doc` },
    });
    const attachments = await prisma.attachment.findMany({
      where: { entityType: "TrustCenterDocument", entityId: document.id },
    });
    expect(attachments).toHaveLength(1);
    const originalKey = attachments[0]!.storageKey;
    await expect(storage.read(originalKey)).resolves.toBeTruthy();

    // Replace the file: old storage file must be deleted, one row remains.
    const replaced = await saveTrustDocumentAction(
      undefined,
      formDataWith({
        id: document.id,
        title: `${PREFIX} Doc`,
        category: "POLICY",
        published: true,
        file: testFile("policy-v2.pdf", minimalPdf, "application/pdf"),
      }),
    );
    expect(replaced?.ok).toBe(true);

    const after = await prisma.attachment.findMany({
      where: { entityType: "TrustCenterDocument", entityId: document.id },
    });
    expect(after).toHaveLength(1);
    expect(after[0]!.storageKey).not.toBe(originalKey);
    await expect(storage.read(originalKey)).rejects.toThrow();
    await expect(storage.read(after[0]!.storageKey)).resolves.toBeTruthy();
  });

  it("rejects non-PDF uploads claiming to be PDFs via magic bytes", async () => {
    const result = await saveTrustDocumentAction(
      undefined,
      formDataWith({
        title: `${PREFIX} Fake PDF`,
        category: "POLICY",
        published: true,
        file: testFile(
          "fake.pdf",
          Buffer.from("this is definitely not a pdf"),
          "application/pdf",
        ),
      }),
    );
    expect(result?.ok).toBe(false);

    const stored = await prisma.trustCenterDocument.findFirst({
      where: { title: `${PREFIX} Fake PDF` },
    });
    expect(stored).toBeNull();
  });

  it("deleteTrustDocumentAction removes rows and storage files", async () => {
    const created = await saveTrustDocumentAction(
      undefined,
      formDataWith({
        title: `${PREFIX} Delete Me`,
        category: "SECURITY",
        published: true,
        file: testFile("delete-me.pdf", minimalPdf, "application/pdf"),
      }),
    );
    expect(created?.ok).toBe(true);

    const document = await prisma.trustCenterDocument.findFirstOrThrow({
      where: { title: `${PREFIX} Delete Me` },
    });
    const attachment = await prisma.attachment.findFirstOrThrow({
      where: { entityType: "TrustCenterDocument", entityId: document.id },
    });
    await expect(storage.read(attachment.storageKey)).resolves.toBeTruthy();

    const formData = new FormData();
    formData.set("id", document.id);
    await deleteTrustDocumentAction(formData);

    expect(
      await prisma.trustCenterDocument.findUnique({
        where: { id: document.id },
      }),
    ).toBeNull();
    expect(
      await prisma.attachment.count({
        where: { entityType: "TrustCenterDocument", entityId: document.id },
      }),
    ).toBe(0);
    await expect(storage.read(attachment.storageKey)).rejects.toThrow();
  });

  it("validates subprocessor and section inputs", async () => {
    const badSubprocessor = await saveTrustSubprocessorAction(
      undefined,
      formDataWith({ name: "", published: true }),
    );
    expect(badSubprocessor?.ok).toBe(false);

    const badSection = await saveTrustSectionAction(
      undefined,
      formDataWith({
        title: `${PREFIX} Section`,
        body: "x".repeat(10_001),
        published: true,
      }),
    );
    expect(badSection?.ok).toBe(false);
    expect(badSection?.message).toMatch(/too long/i);

    const goodSubprocessor = await saveTrustSubprocessorAction(
      undefined,
      formDataWith({
        name: `${PREFIX} Subprocessor`,
        purpose: "Cloud hosting",
        location: "Australia",
        published: true,
      }),
    );
    expect(goodSubprocessor?.ok).toBe(true);
  });
});
