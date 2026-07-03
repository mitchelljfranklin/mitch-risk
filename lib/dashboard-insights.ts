export type RagBand = "green" | "amber" | "red" | "unscored";

export const RISK_TIER_ORDER = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "Unspecified",
] as const;

export type RiskTierLabel = (typeof RISK_TIER_ORDER)[number];

export function ragBand(score: number | null): RagBand {
  if (score === null) return "unscored";
  if (score >= 0.85) return "green";
  if (score >= 0.6) return "amber";
  return "red";
}

export type TierScoreInput = {
  tier: string | null;
  overallScore: number | null;
};

export type RiskByTierRow = {
  tier: RiskTierLabel;
  green: number;
  amber: number;
  red: number;
  unscored: number;
  total: number;
};

export function computeRiskByTier(vendors: TierScoreInput[]): RiskByTierRow[] {
  const rows = new Map<RiskTierLabel, RiskByTierRow>();
  for (const tier of RISK_TIER_ORDER) {
    rows.set(tier, {
      tier,
      green: 0,
      amber: 0,
      red: 0,
      unscored: 0,
      total: 0,
    });
  }

  for (const vendor of vendors) {
    const tier: RiskTierLabel = RISK_TIER_ORDER.includes(
      vendor.tier as RiskTierLabel,
    )
      ? (vendor.tier as RiskTierLabel)
      : "Unspecified";
    const row = rows.get(tier)!;
    row[ragBand(vendor.overallScore)] += 1;
    row.total += 1;
  }

  return RISK_TIER_ORDER.map((tier) => rows.get(tier)!).filter(
    (row) => row.total > 0,
  );
}
