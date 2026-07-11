# Scoring Configuration

Scoring weights and RAG thresholds are configurable under **Settings → Scoring** (requires **Settings: manage** permission).

> For a complete walkthrough of the scoring methodology — including inherent risk, worked examples, findings reconciliation, and the relationship between inherent and residual risk — see the [Scoring Methodology](/user-guides/scoring) guide.

## Risk weights

Each question carries a risk weight that determines its impact on the overall assessment score:

| Weight | Default | When to use |
|---|---|---|
| **Critical** | 10 | Answer would be deal-breaking if non-compliant |
| **High** | 6 | Core security or compliance requirements |
| **Medium** | 3 | Standard due diligence questions |
| **Low** | 1 | Supplementary or nice-to-have questions |

## RAG thresholds

The overall score maps to a red-amber-green band:

| Band | Default | Meaning |
|---|---|---|
| **Green** | ≥ 85% | Vendor meets expectations |
| **Amber** | 60% – 84% | Some gaps — monitor closely |
| **Red** | < 60% | Significant risks — action needed |
| **Unscored** | null | No scorable questions answered |

Thresholds are configurable — e.g. if you want stricter scoring, raise the green threshold to 90%.

## Formula

```
For each response:
  if N/A → excluded from score
  if answer matches expected → contributes full risk weight
  if answer does not match → contributes 0, generates a finding
  if unscorable (Free Text, File Upload, etc.) → excluded

Total Score = sum(weighted scores) / sum(max scores)
              (0.0 – 1.0 ratio)
```

## Excluding N/A responses

By default, questions answered "Not Applicable" are excluded from the score denominator. This behaviour is configurable — you can include N/A responses as non-compliant instead, which would lower the score.

## RAG colours

The visual colours for each band are configurable under **Settings → Appearance**. These are cosmetic only — they don't affect the threshold logic.

> RAG colour tokens (`--rag-green`, `--rag-amber`, `--rag-red`) are **only** for score/compliance indicators. UI chrome like success/error badges uses separate semantic tokens (`--success`, `--destructive`).
