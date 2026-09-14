import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AUDIT_ACTIONS, listAuditLogs, logAudit } from "@/lib/db/audit";
import { AUDIT_ACTION_LABELS } from "@/lib/db/audit-types";
import { prisma } from "@/lib/prisma";

const VENDOR_NAME = "Audit Resolver Test Vendor";
const ASSESSMENT_TITLE = "Audit Resolver Test assessment";
const TEST_USER_EMAIL = "[EMAIL]";
const UNKNOWN_TYPE_ACTION = "SOMETHING_ELSE";

let testUserId: string | null = null;

async function cleanup() {
  // Scope to rows this suite creates: rows attached to our throwaway user,
  // the synthetic unknown-type action, and legacy "Settings"-typed rows.
  // Never wipe the whole audit_logs table — other data lives there.
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        ...(testUserId ? [{ userId: testUserId }] : []),
        { action: UNKNOWN_TYPE_ACTION },
        { entityType: "Settings" },
      ],
    },
  });
  await prisma.vendor.deleteMany({ where: { name: VENDOR_NAME } });
  await prisma.user.deleteMany({
    where: { email: { equals: TEST_USER_EMAIL, mode: "insensitive" } },
  });
}

beforeAll(async () => {
  await cleanup();
  const viewerRole = await prisma.role.findUnique({
    where: { name: "Viewer" },
    select: { id: true },
  });
  if (!viewerRole) throw new Error("Viewer role not found");
  const user = await prisma.user.create({
    data: {
      name: "Audit Test User",
      email: TEST_USER_EMAIL,
      passwordHash: "",
      roleId: viewerRole.id,
    },
  });
  testUserId = user.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

async function logForTest(
  action: string,
  entityType?: string,
  entityId?: string,
) {
  if (!testUserId) throw new Error("test user not created");
  await logAudit(testUserId, action, entityType, entityId);
}

describe("audit entity name resolution (integration)", () => {
  it("resolves a vendor name", async () => {
    const vendor = await prisma.vendor.create({
      data: { name: VENDOR_NAME, contactEmail: "audit-test@example.test" },
    });
    await logForTest(AUDIT_ACTIONS.UPDATE_VENDOR, "Vendor", vendor.id);

    const result = await listAuditLogs({
      action: AUDIT_ACTIONS.UPDATE_VENDOR,
      pageSize: 10,
    });
    const entry = result.entries.find(
      (candidate) => candidate.entityId === vendor.id,
    );
    expect(entry?.entityName).toBe(VENDOR_NAME);
  });

  it("resolves a control as code — title", async () => {
    const control = await prisma.control.findFirst({
      where: { framework: { name: "ISO 27001" } },
      select: { id: true, code: true, title: true },
    });
    if (!control) throw new Error("no ISO control seeded");

    await logForTest(AUDIT_ACTIONS.MARK_CONTROL_SHARED, "Control", control.id);

    const result = await listAuditLogs({
      action: AUDIT_ACTIONS.MARK_CONTROL_SHARED,
      pageSize: 10,
    });
    const entry = result.entries.find(
      (candidate) => candidate.entityId === control.id,
    );
    expect(entry?.entityName).toBe(`${control.code} — ${control.title}`);
  });

  it("resolves a responsibility action to its control title", async () => {
    const vendor = await prisma.vendor.create({
      data: { name: VENDOR_NAME, contactEmail: "audit-test@example.test" },
    });
    const action = await prisma.customerResponsibilityAction.create({
      data: {
        vendorId: vendor.id,
        controlCode: "CC1.1",
        frameworkName: "SOC 2",
        controlTitle: "Control Environment",
      },
    });
    await logForTest(
      AUDIT_ACTIONS.UPDATE_RESPONSIBILITY_ACTION,
      "CustomerResponsibilityAction",
      action.id,
    );

    const result = await listAuditLogs({
      action: AUDIT_ACTIONS.UPDATE_RESPONSIBILITY_ACTION,
      pageSize: 10,
    });
    const entry = result.entries.find(
      (candidate) => candidate.entityId === action.id,
    );
    expect(entry?.entityName).toBe("Control Environment");
  });

  it("resolves a review-decision response to its assessment title", async () => {
    const vendor = await prisma.vendor.create({
      data: { name: VENDOR_NAME, contactEmail: "audit-test@example.test" },
    });
    const template = await prisma.template.create({
      data: {
        name: `${VENDOR_NAME} template`,
        status: "PUBLISHED",
        version: 1,
      },
    });
    const assessment = await prisma.assessment.create({
      data: {
        vendorId: vendor.id,
        templateId: template.id,
        title: ASSESSMENT_TITLE,
      },
    });
    const section = await prisma.section.create({
      data: { templateId: template.id, title: "S", order: 0 },
    });
    const assessmentQuestion = await prisma.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        sectionTitle: section.title,
        text: "Q",
        type: "YES_NO",
        riskWeight: "LOW",
        required: false,
        order: 0,
        expectedAnswer: "YES",
        options: [],
      },
    });
    const response = await prisma.response.create({
      data: {
        assessmentId: assessment.id,
        assessmentQuestionId: assessmentQuestion.id,
      },
    });
    await logForTest(AUDIT_ACTIONS.REVIEW_DECISION, "Response", response.id);

    const result = await listAuditLogs({
      action: AUDIT_ACTIONS.REVIEW_DECISION,
      pageSize: 10,
    });
    const entry = result.entries.find(
      (candidate) => candidate.entityId === response.id,
    );
    expect(entry?.entityName).toBe(ASSESSMENT_TITLE);
  });

  it("humanises Setting entity ids, including the legacy 'Settings' alias", async () => {
    await logForTest(AUDIT_ACTIONS.UPDATE_SETTINGS, "Setting", "trustcenter");
    await logForTest(AUDIT_ACTIONS.UPDATE_SETTINGS, "Settings", "storage");

    const result = await listAuditLogs({
      action: AUDIT_ACTIONS.UPDATE_SETTINGS,
      pageSize: 50,
    });

    const singular = result.entries.find(
      (entry) =>
        entry.entityType === "Setting" && entry.entityId === "trustcenter",
    );
    expect(singular?.entityName).toBe("Trust center");

    const legacy = result.entries.find(
      (entry) =>
        entry.entityType === "Settings" && entry.entityId === "storage",
    );
    expect(legacy?.entityName).toBe("Storage");
  });

  it("shows 'Deleted' for a removed entity, not for an unknown type", async () => {
    await logForTest(
      AUDIT_ACTIONS.UPDATE_VENDOR,
      "Vendor",
      "nonexistent-vendor-id",
    );
    await logForTest(UNKNOWN_TYPE_ACTION, "BrandNewKind", "kind-1");

    const vendorResult = await listAuditLogs({
      action: AUDIT_ACTIONS.UPDATE_VENDOR,
      pageSize: 10,
    });
    const deletedEntry = vendorResult.entries.find(
      (candidate) => candidate.entityId === "nonexistent-vendor-id",
    );
    // Handled type but no row: the name stays null and the audit table
    // renders "Deleted" as its fallback label.
    expect(deletedEntry?.entityName).toBeNull();

    const unknownResult = await listAuditLogs({
      action: UNKNOWN_TYPE_ACTION,
      pageSize: 10,
    });
    const unknownEntry = unknownResult.entries.find(
      (candidate) => candidate.entityId === "kind-1",
    );
    expect(unknownEntry?.entityName).toBe("Brand New Kind");
  });
});

describe("audit action label coverage", () => {
  it("every audit action constant has a human-readable label", () => {
    for (const action of Object.values(AUDIT_ACTIONS)) {
      const label = AUDIT_ACTION_LABELS[action];
      expect(label, `missing label for ${action}`).toBeTruthy();
      expect(label, `label for ${action} is the raw key`).not.toBe(action);
    }
  });
});
