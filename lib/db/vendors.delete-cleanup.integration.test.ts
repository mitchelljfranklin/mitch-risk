import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { deleteVendor } from "@/lib/db/vendors";
import { storage } from "@/lib/storage";

// Regression coverage for the Batch-A vendor-delete fix: every polymorphic
// attachment bucket (evidence via assessments, vendor, certification and
// customer-responsibility actions) must lose both its database row and its
// storage file. The orphan sweep treats every remaining attachment row as
// referenced, so anything missed here would be stranded forever.
const PREFIX = "P-DELETE-CLEANUP";

const seededKeys = {
  evidence: `${PREFIX}/evidence.txt`,
  vendorAttachment: `${PREFIX}/vendor-attachment.txt`,
  certificationAttachment: `${PREFIX}/cert-attachment.txt`,
  responsibilityAttachment: `${PREFIX}/responsibility-attachment.txt`,
};

let vendorId = "";

async function cleanup(): Promise<void> {
  const vendor = await prisma.vendor.findFirst({
    where: { name: `${PREFIX} Vendor` },
    select: { id: true },
  });
  if (vendor) {
    await prisma.attachment.deleteMany({
      where: { entityId: vendor.id },
    });
    await prisma.vendor.deleteMany({ where: { id: vendor.id } });
  }
  for (const key of Object.values(seededKeys)) {
    await storage.delete(key).catch(() => {
      // already absent
    });
  }
}

beforeAll(async () => {
  await cleanup();

  for (const key of Object.values(seededKeys)) {
    await storage.save(key, Buffer.from(`content of ${key}`, "utf8"));
  }

  const vendor = await prisma.vendor.create({
    data: { name: `${PREFIX} Vendor`, contactEmail: "cleanup@example.test" },
  });
  vendorId = vendor.id;

  const assessment = await prisma.assessment.create({
    data: { vendorId: vendor.id, title: `${PREFIX} Assessment` },
  });
  await prisma.evidence.create({
    data: {
      assessmentId: assessment.id,
      fileName: "evidence.txt",
      storageKey: seededKeys.evidence,
      mimeType: "text/plain",
      sizeBytes: 10,
    },
  });

  await prisma.attachment.create({
    data: {
      entityType: "Vendor",
      entityId: vendor.id,
      fileName: "vendor-attachment.txt",
      storageKey: seededKeys.vendorAttachment,
      mimeType: "text/plain",
      sizeBytes: 10,
    },
  });

  const certification = await prisma.vendorCertification.create({
    data: {
      vendorId: vendor.id,
      name: `${PREFIX} Cert`,
      expiresDate: new Date(Date.UTC(2030, 0, 1)),
    },
  });
  await prisma.attachment.create({
    data: {
      entityType: "VendorCertification",
      entityId: certification.id,
      fileName: "cert-attachment.txt",
      storageKey: seededKeys.certificationAttachment,
      mimeType: "text/plain",
      sizeBytes: 10,
    },
  });

  const action = await prisma.customerResponsibilityAction.create({
    data: {
      vendorId: vendor.id,
      certificationId: certification.id,
      controlCode: "A.5.19",
      frameworkName: "ISO 27001",
      controlTitle: "Supplier relationships",
      status: "PENDING",
    },
  });
  await prisma.attachment.create({
    data: {
      entityType: "CustomerResponsibilityAction",
      entityId: action.id,
      fileName: "responsibility-attachment.txt",
      storageKey: seededKeys.responsibilityAttachment,
      mimeType: "text/plain",
      sizeBytes: 10,
    },
  });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("deleteVendor storage lifecycle (integration)", () => {
  it("removes attachment rows and files from every bucket", async () => {
    for (const key of Object.values(seededKeys)) {
      await expect(storage.read(key)).resolves.toBeTruthy();
    }

    await deleteVendor(vendorId);

    // Rows: all attachment records tied to the vendor's entities are gone.
    const remainingRows = await prisma.attachment.findMany({
      where: {
        OR: [
          { entityId: vendorId },
          { entityType: "Vendor", entityId: vendorId },
        ],
      },
      select: { storageKey: true },
    });
    expect(remainingRows).toEqual([]);

    // Files: every seeded storage key becomes unreadable.
    for (const key of Object.values(seededKeys)) {
      await expect(storage.read(key)).rejects.toThrow();
    }

    // The cascade removed the responsibility actions themselves.
    const strandedActions = await prisma.customerResponsibilityAction.findMany({
      where: { vendorId },
    });
    expect(strandedActions).toEqual([]);
  });
});
