import { describe, expect, it } from "vitest";

import { computeRiskByTier, ragBand } from "@/lib/dashboard-insights";

describe("ragBand", () => {
  it("bands scores into RAG buckets", () => {
    expect(ragBand(null)).toBe("unscored");
    expect(ragBand(0.9)).toBe("green");
    expect(ragBand(0.85)).toBe("green");
    expect(ragBand(0.7)).toBe("amber");
    expect(ragBand(0.6)).toBe("amber");
    expect(ragBand(0.5)).toBe("red");
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
});
