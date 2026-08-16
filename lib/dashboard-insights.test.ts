import { describe, expect, it } from "vitest";

import {
  computeDomainCompliance,
  computeRiskByTier,
  ragBand,
} from "@/lib/dashboard-insights";

describe("ragBand", () => {
  it("bands scores into RAG buckets with default thresholds", () => {
    expect(ragBand(null)).toBe("unscored");
    expect(ragBand(0.9)).toBe("green");
    expect(ragBand(0.85)).toBe("green");
    expect(ragBand(0.7)).toBe("amber");
    expect(ragBand(0.6)).toBe("amber");
    expect(ragBand(0.5)).toBe("red");
  });

  it("honours configured thresholds", () => {
    const thresholds = { green: 0.9, amber: 0.75 };
    expect(ragBand(0.85, thresholds)).toBe("amber");
    expect(ragBand(0.9, thresholds)).toBe("green");
    expect(ragBand(0.74, thresholds)).toBe("red");
  });
});

describe("computeRiskByTier", () => {
  it("groups vendors by tier and RAG band, ordered and non-empty only", () => {
    const rows = computeRiskByTier([
      { tier: "CRITICAL", overallScore: 0.9 },
      { tier: "CRITICAL", overallScore: 0.4 },
      { tier: "HIGH", overallScore: null },
      { tier: null, overallScore: 0.7 },
      { tier: "bogus", overallScore: 0.95 },
    ]);

    const byTier = Object.fromEntries(rows.map((r) => [r.tier, r]));
    expect(byTier.CRITICAL.green).toBe(1);
    expect(byTier.CRITICAL.red).toBe(1);
    expect(byTier.CRITICAL.total).toBe(2);
    expect(byTier.HIGH.unscored).toBe(1);
    // null tier and unknown tier both fall under "Unspecified".
    expect(byTier.Unspecified.total).toBe(2);
    expect(byTier.Unspecified.amber).toBe(1);
    expect(byTier.Unspecified.green).toBe(1);

    // MEDIUM/LOW have no vendors, so they're excluded.
    expect(byTier.MEDIUM).toBeUndefined();
    // Ordering: CRITICAL before HIGH before Unspecified.
    expect(rows[0].tier).toBe("CRITICAL");
  });

  it("returns an empty array when there are no vendors", () => {
    expect(computeRiskByTier([])).toEqual([]);
  });

  it("applies configured thresholds when banding tiers", () => {
    const rows = computeRiskByTier(
      [
        { tier: "HIGH", overallScore: 0.88 },
        { tier: "HIGH", overallScore: 0.78 },
      ],
      { green: 0.9, amber: 0.8 },
    );
    const high = rows.find((row) => row.tier === "HIGH")!;
    expect(high.amber).toBe(1);
    expect(high.red).toBe(1);
    expect(high.green).toBe(0);
  });
});

describe("computeDomainCompliance", () => {
  const riskWeights = { CRITICAL: 10, HIGH: 6, MEDIUM: 3, LOW: 1 };

  it("computes a per-domain compliance ratio", () => {
    const controlDomainMap = new Map([
      ["c1", "Organizational"],
      ["c2", "People"],
    ]);

    const domains = computeDomainCompliance(
      [
        {
          controlIds: ["c1"],
          riskWeight: "CRITICAL",
          isNotApplicable: false,
          isCompliant: false,
        },
        {
          controlIds: ["c2"],
          riskWeight: "LOW",
          isNotApplicable: false,
          isCompliant: true,
        },
      ],
      controlDomainMap,
      riskWeights,
    );

    const byDomain = Object.fromEntries(
      domains.map((domain) => [domain.domain, domain.ratio]),
    );
    expect(byDomain.Organizational).toBe(0);
    expect(byDomain.People).toBe(1);
  });

  it("CRITICAL non-compliance penalises more than LOW non-compliance", () => {
    const controlDomainMap = new Map([["c1", "Organizational"]]);

    const compliant = computeDomainCompliance(
      [
        {
          controlIds: ["c1"],
          riskWeight: "CRITICAL",
          isNotApplicable: false,
          isCompliant: true,
        },
        {
          controlIds: ["c1"],
          riskWeight: "LOW",
          isNotApplicable: false,
          isCompliant: true,
        },
      ],
      controlDomainMap,
      riskWeights,
    );
    expect(compliant[0].ratio).toBe(1);

    const criticalWrong = computeDomainCompliance(
      [
        {
          controlIds: ["c1"],
          riskWeight: "CRITICAL",
          isNotApplicable: false,
          isCompliant: false,
        },
        {
          controlIds: ["c1"],
          riskWeight: "LOW",
          isNotApplicable: false,
          isCompliant: true,
        },
      ],
      controlDomainMap,
      riskWeights,
    );
    expect(criticalWrong[0].ratio).toBeCloseTo(1 / 11);

    const lowWrong = computeDomainCompliance(
      [
        {
          controlIds: ["c1"],
          riskWeight: "CRITICAL",
          isNotApplicable: false,
          isCompliant: true,
        },
        {
          controlIds: ["c1"],
          riskWeight: "LOW",
          isNotApplicable: false,
          isCompliant: false,
        },
      ],
      controlDomainMap,
      riskWeights,
    );
    expect(lowWrong[0].ratio).toBeCloseTo(10 / 11);

    expect(criticalWrong[0].ratio).toBeLessThan(lowWrong[0].ratio);
  });

  it("excludes N/A and unscorable responses from both sides", () => {
    const controlDomainMap = new Map([["c1", "Organizational"]]);

    const domains = computeDomainCompliance(
      [
        {
          controlIds: ["c1"],
          riskWeight: "HIGH",
          isNotApplicable: true,
          isCompliant: null,
        },
        {
          controlIds: ["c1"],
          riskWeight: "HIGH",
          isNotApplicable: false,
          isCompliant: null,
        },
      ],
      controlDomainMap,
      riskWeights,
    );

    expect(domains).toEqual([]);
  });

  it("counts a question against every mapped domain", () => {
    const controlDomainMap = new Map([
      ["c1", "Organizational"],
      ["c2", "People"],
    ]);

    const domains = computeDomainCompliance(
      [
        {
          controlIds: ["c1", "c2"],
          riskWeight: "MEDIUM",
          isNotApplicable: false,
          isCompliant: true,
        },
      ],
      controlDomainMap,
      riskWeights,
    );

    expect(domains).toHaveLength(2);
    for (const domain of domains) {
      expect(domain.ratio).toBe(1);
      expect(domain.controlCount).toBe(1);
    }
  });

  it("counts every mapped control in the controlCount", () => {
    const controlDomainMap = new Map([
      ["c1", "Organizational"],
      ["c2", "Organizational"],
    ]);

    const domains = computeDomainCompliance(
      [
        {
          controlIds: ["c1", "c2"],
          riskWeight: "MEDIUM",
          isNotApplicable: false,
          isCompliant: true,
        },
      ],
      controlDomainMap,
      riskWeights,
    );

    expect(domains).toHaveLength(1);
    expect(domains[0].domain).toBe("Organizational");
    expect(domains[0].ratio).toBe(1);
    expect(domains[0].controlCount).toBe(2);
  });

  it("omits domains with zero weighted total and sorts alphabetically", () => {
    const controlDomainMap = new Map([
      ["c1", "People"],
      ["c2", "Organizational"],
      ["c3", "Unmapped"],
    ]);

    const domains = computeDomainCompliance(
      [
        {
          controlIds: ["c2"],
          riskWeight: "HIGH",
          isNotApplicable: false,
          isCompliant: true,
        },
        {
          controlIds: ["c1"],
          riskWeight: "MEDIUM",
          isNotApplicable: false,
          isCompliant: false,
        },
      ],
      controlDomainMap,
      riskWeights,
    );

    expect(domains.map((domain) => domain.domain)).toEqual([
      "Organizational",
      "People",
    ]);
  });
});
