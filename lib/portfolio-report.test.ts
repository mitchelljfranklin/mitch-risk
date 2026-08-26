import { describe, expect, it } from "vitest";

import { buildPortfolioPdfData } from "@/lib/portfolio-report";

function dashboardFixture() {
  return {
    vendorCount: 2,
    averageScore: 0.72,
    openFindings: 4,
    needsAttention: 1,
    scoreDistribution: { green: 1, amber: 1, red: 0, unscored: 0 },
    vendorsByTier: { HIGH: 2 },
    assessmentStatusCounts: { COMPLETED: 3, SENT: 1 },
    vendors: [
      {
        name: "Vendor With Assessments",
        tier: "HIGH",
        overallScore: 0.9,
        latestAssessmentDate: new Date("2026-08-01T00:00:00Z"),
        assessmentCount: 5,
      },
      {
        name: "Never Assessed Vendor",
        tier: null,
        overallScore: null,
        latestAssessmentDate: null,
        assessmentCount: 0,
      },
    ],
    topDeficientControls: [
      {
        code: "A.5.19",
        title: "Information security in supplier relationships",
        vendorCount: 2,
      },
    ],
  };
}

describe("buildPortfolioPdfData", () => {
  it("maps per-vendor assessment counts straight from the dashboard data", () => {
    const data = buildPortfolioPdfData(
      dashboardFixture(),
      "Acme",
      "2026-08-26",
    );

    expect(data.organizationName).toBe("Acme");
    expect(data.generatedDate).toBe("2026-08-26");
    expect(data.vendorCount).toBe(2);

    const counted = data.vendors.find(
      (vendor) => vendor.name === "Vendor With Assessments",
    );
    expect(counted?.assessmentCount).toBe(5);

    const unassessed = data.vendors.find(
      (vendor) => vendor.name === "Never Assessed Vendor",
    );
    expect(unassessed?.assessmentCount).toBe(0);
  });

  it("maps top deficient controls with codes, titles and affected vendor counts", () => {
    const data = buildPortfolioPdfData(
      dashboardFixture(),
      "Acme",
      "2026-08-26",
    );

    expect(data.topControls).toEqual([
      {
        code: "A.5.19",
        title: "Information security in supplier relationships",
        vendorCount: 2,
      },
    ]);
  });
});
