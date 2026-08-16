import { type RiskWeight } from "../prisma/generated/prisma/client";

export type RagBand = "green" | "amber" | "red" | "unscored";

export type RagThresholds = { green: number; amber: number };

const DEFAULT_RAG_THRESHOLDS: RagThresholds = {
  green: 0.85,
  amber: 0.6,
};

const RISK_TIER_ORDER = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "Unspecified",
] as const;

export type RiskTierLabel = (typeof RISK_TIER_ORDER)[number];

export function ragBand(
  score: number | null,
  thresholds: RagThresholds = DEFAULT_RAG_THRESHOLDS,
): RagBand {
  if (score === null) return "unscored";
  if (score >= thresholds.green) return "green";
  if (score >= thresholds.amber) return "amber";
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

export function computeRiskByTier(
  vendors: TierScoreInput[],
  thresholds: RagThresholds = DEFAULT_RAG_THRESHOLDS,
): RiskByTierRow[] {
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
    row[ragBand(vendor.overallScore, thresholds)] += 1;
    row.total += 1;
  }

  return RISK_TIER_ORDER.map((tier) => rows.get(tier)!).filter(
    (row) => row.total > 0,
  );
}

export type DomainQuestionInput = {
  controlIds: string[];
  riskWeight: RiskWeight;
  isNotApplicable: boolean;
  isCompliant: boolean | null;
};

export type DomainCompliance = {
  domain: string;
  ratio: number;
  controlCount: number;
};

export function computeDomainCompliance(
  questions: DomainQuestionInput[],
  controlDomainMap: Map<string, string>,
  riskWeights: Record<RiskWeight, number>,
): DomainCompliance[] {
  const byDomain = new Map<
    string,
    { weighted: number; max: number; count: number }
  >();

  for (const question of questions) {
    if (question.isNotApplicable || question.isCompliant === null) {
      continue;
    }
    const weight = riskWeights[question.riskWeight] ?? 0;
    for (const controlId of question.controlIds) {
      const domain = controlDomainMap.get(controlId);
      if (!domain) {
        continue;
      }
      const entry = byDomain.get(domain) ?? { weighted: 0, max: 0, count: 0 };
      entry.max += weight;
      entry.count += 1;
      if (question.isCompliant) {
        entry.weighted += weight;
      }
      byDomain.set(domain, entry);
    }
  }

  return [...byDomain.entries()]
    .filter(([, entry]) => entry.max > 0)
    .map(([domain, entry]) => ({
      domain,
      ratio: entry.weighted / entry.max,
      controlCount: entry.count,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}
