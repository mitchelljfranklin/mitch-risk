import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAssessment,
  getAssessmentByToken,
  saveResponses,
  sendAssessment,
  submitAssessment,
} from "@/lib/db/assessments";
import {
  addQuestion,
  addSection,
  createTemplate,
  publishTemplate,
} from "@/lib/db/templates";
import { createVendor } from "@/lib/db/vendors";
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { createUser } from "@/lib/db/users";
import {
  getFindingSummary,
  listFindings,
  listVendorFindings,
  updateFindingStatus,
} from "@/lib/db/findings";
import { scoreAssessment } from "@/lib/db/scoring";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { type QuestionInput } from "@/lib/schemas/template";

const VENDOR = "P53 Findings Vendor";
const TEMPLATE = "P53 Findings Template";
const REVIEWER_EMAIL = "p53-findings-reviewer@example.test";
const REGISTER_VENDOR = "P66 Register Vendor";
const REGISTER_TEMPLATE = "P66 Register Template";
const PAGING_VENDOR = "P75 Paging Vendor";
const PAGING_TEMPLATE = "P75 Paging Template";

function buildQuestion(
  overrides: Partial<QuestionInput> & Pick<QuestionInput, "text" | "type">,
): QuestionInput {
  return {
    helpText: "",
    riskWeight: "HIGH",
    required: true,
    options: [],
    expectedAnswer: "",
    conditionalLogic: { match: "all", rules: [] },
    controlIds: [],
    ...overrides,
  };
}

async function cleanup() {
  await prisma.vendor.deleteMany({
    where: { name: { in: [VENDOR, REGISTER_VENDOR, PAGING_VENDOR] } },
  });
  await prisma.template.deleteMany({
    where: { name: { in: [TEMPLATE, REGISTER_TEMPLATE, PAGING_TEMPLATE] } },
  });
  await prisma.user.deleteMany({ where: { email: REVIEWER_EMAIL } });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("finding status workflow (integration)", () => {
  it("preserves a reviewer-set status across a rescore", async () => {
    const template = await createTemplate({ name: TEMPLATE, description: "" });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({
        text: "Do you enforce MFA?",
        type: "YES_NO",
        expectedAnswer: "YES",
      }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: VENDOR,
      contactName: "",
      contactEmail: "p53@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    const assessment = await createAssessment(vendor.id, {
      title: "P53 assessment",
      templateId: template.id,
      dueDate: "",
      reviewerId: "",
    });
    await sendAssessment(assessment.id);

    const sent = await prisma.assessment.findUniqueOrThrow({
      where: { id: assessment.id },
      select: { accessToken: true },
    });
    const token = sent.accessToken;
    if (!token) throw new Error("no token");

    const portal = await getAssessmentByToken(token);
    if (!portal) throw new Error("portal not found");

    // Answer non-compliant (expected YES) so scoring generates a finding.
    await saveResponses(token, [
      {
        assessmentQuestionId: portal.questions[0].id,
        value: "NO",
        isNotApplicable: false,
      },
    ]);
    await submitAssessment(token);

    const finding = await prisma.finding.findFirstOrThrow({
      where: { assessmentId: assessment.id },
    });
    expect(finding.status).toBe("OPEN");

    await ensureSystemRoles();
    const reviewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
    if (!reviewerRole) throw new Error("reviewer role missing");
    const reviewer = await createUser({
      name: "P53 Reviewer",
      email: REVIEWER_EMAIL,
      password: "correct-horse-battery-staple",
      roleId: reviewerRole.id,
    });

    await updateFindingStatus({
      findingId: finding.id,
      status: "REMEDIATED",
      resolutionNote: "Vendor provided MFA evidence.",
      resolvedById: reviewer.id,
    });

    // A rescore must NOT wipe the reviewer's decision.
    await scoreAssessment(assessment.id);

    const after = await prisma.finding.findUniqueOrThrow({
      where: { id: finding.id },
    });
    expect(after.status).toBe("REMEDIATED");
    expect(after.resolutionNote).toBe("Vendor provided MFA evidence.");
    expect(after.resolvedById).toBe(reviewer.id);
  });

  it("clears resolver fields when a finding is reopened", async () => {
    const finding = await prisma.finding.findFirstOrThrow({
      where: { assessment: { vendor: { name: VENDOR } } },
    });
    await updateFindingStatus({
      findingId: finding.id,
      status: "OPEN",
      resolvedById: "ignored-when-open",
    });
    const reopened = await prisma.finding.findUniqueOrThrow({
      where: { id: finding.id },
    });
    expect(reopened.status).toBe("OPEN");
    expect(reopened.resolvedAt).toBeNull();
    expect(reopened.resolvedById).toBeNull();
  });
});

describe("risk register queries (integration)", () => {
  let vendorId = "";

  beforeAll(async () => {
    const template = await createTemplate({
      name: REGISTER_TEMPLATE,
      description: "",
    });
    const section = await addSection(template.id, "Section");
    await addQuestion(
      section.id,
      buildQuestion({ text: "Q?", type: "YES_NO", expectedAnswer: "YES" }),
    );
    await publishTemplate(template.id);

    const vendor = await createVendor({
      name: REGISTER_VENDOR,
      contactName: "",
      contactEmail: "p66@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    vendorId = vendor.id;
    const assessment = await createAssessment(vendor.id, {
      title: "P66 assessment",
      templateId: template.id,
      dueDate: "",
      reviewerId: "",
    });

    await prisma.finding.createMany({
      data: [
        {
          assessmentId: assessment.id,
          severity: "CRITICAL",
          status: "OPEN",
          title: "Critical open",
          description: "d",
          controlCodes: ["A.5.1"],
        },
        {
          assessmentId: assessment.id,
          severity: "HIGH",
          status: "OPEN",
          title: "High open",
          description: "d",
          controlCodes: [],
        },
        {
          assessmentId: assessment.id,
          severity: "MEDIUM",
          status: "REMEDIATED",
          title: "Medium remediated",
          description: "d",
          controlCodes: [],
        },
      ],
    });
  });

  it("lists a vendor's findings priority-sorted with vendor/assessment names", async () => {
    const { findings, totalCount } = await listFindings({ vendorId });
    expect(totalCount).toBe(3);
    expect(findings[0].title).toBe("Critical open");
    expect(findings[0].vendorName).toBe(REGISTER_VENDOR);
    expect(findings[0].assessmentTitle).toBe("P66 assessment");
    // Remediated sorts after the open ones.
    expect(findings[findings.length - 1].title).toBe("Medium remediated");
  });

  it("filters by status and severity", async () => {
    const openOnly = await listFindings({ vendorId, status: "OPEN" });
    expect(openOnly.totalCount).toBe(2);

    const criticalOnly = await listFindings({ vendorId, severity: "CRITICAL" });
    expect(criticalOnly.totalCount).toBe(1);
    expect(criticalOnly.findings[0].title).toBe("Critical open");
  });

  it("summarises open findings by severity", async () => {
    const summary = await getFindingSummary();
    expect(summary.open).toBeGreaterThanOrEqual(2);
    expect(summary.openBySeverity.CRITICAL).toBeGreaterThanOrEqual(1);
    expect(summary.remediated).toBeGreaterThanOrEqual(1);
  });

  it("lists per-vendor findings open-first", async () => {
    const vendorFindings = await listVendorFindings(vendorId);
    expect(vendorFindings).toHaveLength(3);
    expect(vendorFindings[0].status).toBe("OPEN");
    expect(vendorFindings[0].severity).toBe("CRITICAL");
  });
});

describe("findings pagination (integration)", () => {
  const TOTAL_FINDINGS = 25;
  let pagingVendorId = "";

  beforeAll(async () => {
    const template = await createTemplate({
      name: PAGING_TEMPLATE,
      description: "",
    });
    const vendor = await createVendor({
      name: PAGING_VENDOR,
      contactName: "",
      contactEmail: "p75@example.test",
      tier: "",
      website: "",
      notes: "",
    });
    pagingVendorId = vendor.id;
    const assessment = await createAssessment(vendor.id, {
      title: "P75 assessment",
      templateId: template.id,
      dueDate: "",
      reviewerId: "",
    });
    await prisma.finding.createMany({
      data: Array.from({ length: TOTAL_FINDINGS }, (_, index) => ({
        assessmentId: assessment.id,
        severity: "HIGH" as const,
        status: "OPEN" as const,
        title: `Paged finding ${index}`,
        description: "d",
        controlCodes: [],
      })),
    });
  });

  it("paginates at the database level with an accurate total count", async () => {
    const firstPage = await listFindings({ vendorId: pagingVendorId, page: 1 });
    expect(firstPage.totalCount).toBe(TOTAL_FINDINGS);
    expect(firstPage.findings).toHaveLength(firstPage.pageSize);

    const secondPage = await listFindings({
      vendorId: pagingVendorId,
      page: 2,
    });
    expect(secondPage.totalCount).toBe(TOTAL_FINDINGS);
    expect(secondPage.findings).toHaveLength(
      TOTAL_FINDINGS - firstPage.pageSize,
    );

    const firstIds = new Set(firstPage.findings.map((finding) => finding.id));
    const overlap = secondPage.findings.filter((finding) =>
      firstIds.has(finding.id),
    );
    expect(overlap).toHaveLength(0);
  });
});
