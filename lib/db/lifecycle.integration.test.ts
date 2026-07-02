import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  deleteAssessment,
  deleteEvidenceForQuestion,
} from "@/lib/db/assessments";
import { deleteVendor } from "@/lib/db/vendors";
import { deleteTemplate } from "@/lib/db/templates";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

const PREFIX = "P48 Lifecycle";

async function cleanup() {
  await prisma.vendor.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.template.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

async function createVendorWithEvidenceAssessment() {
  const vendor = await prisma.vendor.create({
    data: { name: `${PREFIX} Vendor`, contactEmail: "p48@example.test" },
  });
  const assessment = await prisma.assessment.create({
    data: { vendorId: vendor.id, title: `${PREFIX} Assessment` },
  });
  const storageKey = `${assessment.id}/p48-evidence.txt`;
  await storage.save(storageKey, Buffer.from("evidence", "utf8"));
  await prisma.evidence.create({
    data: {
      assessmentId: assessment.id,
      fileName: "p48-evidence.txt",
      storageKey,
      mimeType: "text/plain",
      sizeBytes: 8,
    },
  });
  return { vendor, assessment, storageKey };
}

describe("delete lifecycle (integration)", () => {
  it("deleteAssessment removes evidence rows and their files", async () => {
    const { assessment, storageKey } =
      await createVendorWithEvidenceAssessment();

    await deleteAssessment(assessment.id);

    expect(
      await prisma.assessment.findUnique({ where: { id: assessment.id } }),
    ).toBeNull();
    expect(
      await prisma.evidence.count({ where: { assessmentId: assessment.id } }),
    ).toBe(0);
    await expect(storage.read(storageKey)).rejects.toThrow();
  });

  it("deleteVendor removes its assessments' evidence files", async () => {
    const { vendor, storageKey } = await createVendorWithEvidenceAssessment();

    await deleteVendor(vendor.id);

    expect(
      await prisma.vendor.findUnique({ where: { id: vendor.id } }),
    ).toBeNull();
    await expect(storage.read(storageKey)).rejects.toThrow();
  });

  it("deleteEvidenceForQuestion replaces prior evidence (rows + files)", async () => {
    const vendor = await prisma.vendor.create({
      data: { name: `${PREFIX} Vendor Q`, contactEmail: "p48q@example.test" },
    });
    const assessment = await prisma.assessment.create({
      data: { vendorId: vendor.id, title: `${PREFIX} Assessment Q` },
    });
    const question = await prisma.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        sectionTitle: "S",
        text: "Q?",
        type: "FILE_UPLOAD",
        riskWeight: "MEDIUM",
        required: false,
        order: 0,
      },
    });
    const oldKey = `${assessment.id}/old-file.txt`;
    await storage.save(oldKey, Buffer.from("old", "utf8"));
    await prisma.evidence.create({
      data: {
        assessmentId: assessment.id,
        assessmentQuestionId: question.id,
        fileName: "old-file.txt",
        storageKey: oldKey,
        mimeType: "text/plain",
        sizeBytes: 3,
      },
    });

    const removed = await deleteEvidenceForQuestion(assessment.id, question.id);

    expect(removed).toBe(1);
    expect(
      await prisma.evidence.count({
        where: { assessmentQuestionId: question.id },
      }),
    ).toBe(0);
    await expect(storage.read(oldKey)).rejects.toThrow();

    await prisma.vendor.delete({ where: { id: vendor.id } });
  });

  it("deleteTemplate re-links child versions to the deleted template's parent", async () => {
    const v1 = await prisma.template.create({
      data: { name: `${PREFIX} T`, version: 1 },
    });
    const v2 = await prisma.template.create({
      data: { name: `${PREFIX} T`, version: 2, parentTemplateId: v1.id },
    });
    const v3 = await prisma.template.create({
      data: { name: `${PREFIX} T`, version: 3, parentTemplateId: v2.id },
    });

    await deleteTemplate(v2.id);

    expect(
      await prisma.template.findUnique({ where: { id: v2.id } }),
    ).toBeNull();
    const relinked = await prisma.template.findUnique({ where: { id: v3.id } });
    expect(relinked?.parentTemplateId).toBe(v1.id);
    expect(
      await prisma.template.findUnique({ where: { id: v1.id } }),
    ).not.toBeNull();
  });
});
