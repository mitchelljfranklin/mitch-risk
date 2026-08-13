# Scoring Methodology

Mitch‑Risk uses a three‑layer risk model: **inherent risk** (before any assessment), **assessment scoring** (the vendor's answers to your questionnaire), and **residual risk** (what remains after you account for compensating controls). Together they tell a complete story about each vendor in your portfolio.

## Inherent Risk

Inherent risk is a pre-assessment estimate of the risk a vendor introduces purely by virtue of *who they are* and *what data they touch*. It is computed from static vendor attributes the moment the vendor record is created — before any questionnaire is sent.

### Inherent Risk Factors

| Factor | Values | Notes |
|---|---|---|
| **Vendor tier** | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` | How important or integrated this vendor is to your business |
| **Data sensitivity** | `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC` | The highest classification of data the vendor handles |
| **Contract value** | `$0–$50K`, `$50K–$250K`, `$250K–$1M`, `$1M–$5M`, `$5M+` | Financial exposure — larger contracts mean more reliance |
| **Geographic risk** | `GLOBAL`, `HIGH_RISK_JURISDICTION`, `REGIONAL`, `DOMESTIC` | Where the vendor operates or stores data |

### Inherent Risk Formula

Each factor maps to a 0–1 scale:

| Tier | Weight | Data Sensitivity | Weight |
|---|---|---|---|
| `CRITICAL` | 1.0 | `RESTRICTED` | 1.0 |
| `HIGH` | 0.75 | `CONFIDENTIAL` | 0.75 |
| `MEDIUM` | 0.5 | `INTERNAL` | 0.5 |
| `LOW` | 0.25 | `PUBLIC` | 0.25 |

```
inherentRisk = (tierWeight + sensitivityWeight) / 2
```

**Contract value** and **geographic risk** shift the score by up to ±0.15:
- Contract value over $1M adds up to +0.10
- Contract value between $250K–$1M adds up to +0.05
- High-risk jurisdiction adds +0.10
- Global or regional scope adds +0.05
- Domestic-only reduces by −0.05

The resulting value is clamped to the 0–1 range.

### Interpreting Inherent Risk

| Score | Label | What it means |
|---|---|---|
| 0.75–1.0 | **Critical** | Core vendor, highly sensitive data — asses immediately and frequently |
| 0.50–0.74 | **High** | Important vendor, significant exposure — needs regular assessment |
| 0.25–0.49 | **Medium** | Moderate reliance — standard due diligence cycle |
| 0.00–0.24 | **Low** | Minimal exposure — lighter assessment cadence |

Inherent risk is displayed on the vendor detail page alongside the residual score. The gap between the two — an inherent risk of 0.85 dropping to a residual of 0.42 — is the value your assessment and controls program delivers.

## Assessment Scoring (Weighted Score)

When a vendor completes a questionnaire and a reviewer finalizes it, the **scoring engine** computes a compliance score from every auto-scorable answer. This is the **residual risk** — risk that remains *after* the vendor's actual controls are evaluated.

### Step 1: Exclude Unscorable Question Types

Five question types are **not auto-scored** because they lack a machine-evaluable "right answer":

| Type | Reason |
|---|---|
| `FREE_TEXT` | Open-ended — needs human review |
| `FILE_UPLOAD` | Evidence files — needs human review |
| `DATE` | Context-dependent — no single "correct" date |
| `URL` | Context-dependent |
| `EMAIL` | Context-dependent |

These questions return a `null` compliance status and do not contribute to the score numerator or denominator. They must be reviewed manually by staff, who may create a manual finding if the answer is unsatisfactory.

### Step 2: Exclude N/A Responses

If the vendor marks a question **Not Applicable** (because it genuinely does not apply to their service), it is excluded from both the numerator and denominator of the score. This prevents irrelevant questions from unfairly dragging down a vendor's score.

> The platform default is to exclude N/A responses. You can change this to treat N/A as non-compliant in Settings → Scoring.

### Step 3: Compare Each Response Against Its Expected Answer

For each remaining (auto-scorable, not-N/A) response, the engine compares the vendor's answer to the **expected answer** defined on the question:

| Question Type | Comparison |
|---|---|
| `YES_NO` | `"YES" === "YES"` → compliant |
| `MULTIPLE_CHOICE` | `"Option A" === "Option A"` → compliant |
| `NUMERIC` | `256 === 256` → compliant (uses numeric coercion — `"256"` works) |
| `RATING` | Same as Numeric |
| `COMBOBOX` | `"ISO 27001" === "ISO 27001"` → compliant |
| `MULTI_SELECT` | `["A","B"] === ["A","B"]` → compliant (sorted, exact match, same length) |
| `CHECKBOX` | `true === true` → compliant (boolean parsing: `"yes"`, `"on"`, `"1"`, `"checked"` all parse to `true`) |

A `null` answer (unanswered) is always non-compliant.

### Step 4: Apply the Risk Weight

Each question carries a **risk weight** that determines how much it contributes to the score:

| Risk Weight | Default Value | Description |
|---|---|---|
| `CRITICAL` | 10 | Essential control — failure represents high risk (e.g., "Does the vendor encrypt data at rest?") |
| `HIGH` | 6 | Important control with significant security impact (e.g., "Does the vendor perform penetration testing?") |
| `MEDIUM` | 3 | Standard due diligence question (e.g., "Does the vendor have a change management process?") |
| `LOW` | 1 | Supplementary or nice-to-have (e.g., "Does the vendor publish a transparency report?") |

Weight values are configurable in Settings → Scoring.

For each response:
- **Compliant** → earns the full risk weight (`weightedScore = weight, maxScore = weight`)
- **Non-compliant** → earns zero (`weightedScore = 0, maxScore = weight`)

### Step 5: The Weighted Score Formula

```
Total Score = sum(weightedScores) / sum(maxScores)
```

This produces a **0–1 ratio** displayed as a percentage (0%–100%). A score of `null` means no scorable questions exist (all N/A or all unscorable types).

### Worked Example

A 6-question assessment with questions weighted as shown below. The vendor answered questions 1-5; question 6 is an unscorable free text field (included here for illustration — it is excluded from the calculation).

| # | Question | Risk Weight | Answer | Expected | Compliant? | Weighted | Max |
|---|---|---|---|---|---|---|---|
| 1 | Encrypt data at rest? | CRITICAL (10) | Yes | Yes | ✓ | 10 | 10 |
| 2 | Penetration testing? | HIGH (6) | No | Yes | ✗ | 0 | 6 |
| 3 | MFA enforced? | CRITICAL (10) | Yes | Yes | ✓ | 10 | 10 |
| 4 | Background checks? | MEDIUM (3) | No | Yes | ✗ | 0 | 3 |
| 5 | Not Applicable | LOW (1) | N/A | — | — | 0 | 0 |
| 6 | Describe your IR plan | MEDIUM (3) | *free text* | — | — | 0 | 0 |

```
Total Score = (10 + 0 + 10 + 0) / (10 + 6 + 10 + 3) = 20 / 29 = 0.690 = 69%
```

- Question 5 is N/A — excluded from both numerator and denominator.
- Question 6 is FREE_TEXT — unscorable, excluded from both numerator and denominator.
- Questions 2 and 4 are non-compliant — they contribute 0 to the numerator but their full weight to the denominator, pulling the score down.
- **Result: 69% — Amber band.**

## RAG Classification

The computed score maps to a Red-Amber-Green band using configurable thresholds:

| Band | Default Threshold | Score Range | Meaning |
|---|---|---|---|
| **Green** | ≥ 85% | 85%–100% | Vendor meets expectations — low residual risk |
| **Amber** | 60%–84% | 60%–84% | Partial compliance — gaps exist, monitor and follow up |
| **Red** | < 60% | 0%–59% | Significant gaps — action needed, findings require remediation |
| **Unscored** | — | — | No auto-scorable questions answered |

The thresholds are configurable. If you want stricter scoring, raise the green threshold to 90%. If you tolerate more risk, lower it to 80%.

### RAG Colours

The visual colours for each band (`--rag-green`, `--rag-amber`, `--rag-red`) are configurable under Settings → Appearance. These are cosmetic only — they do not change the threshold logic. RAG colour tokens are used exclusively for score and compliance indicators; UI chrome (success/error states) uses separate semantic tokens.

## Inherent Risk vs Residual Risk

The two scores appear together on every vendor detail page, telling a complete story:

```
┌─────────────────────────────────────────────────────────┐
│  INHERENT RISK (pre-assessment)    │  RESIDUAL (assessed)  │
│  ───────────────────────────────── │  ─────────────────── │
│  Based on who the vendor is and    │  Based on the vendor's │
│  what they handle                  │  actual answers        │
│                                    │                       │
│  Vendor Tier: CRITICAL    (1.00)   │  Assessment Score: 69% │
│  Data Sensitivity: RESTRICTED(1.00)│  Findings: 2 open      │
│  ───────────────────────────────── │                       │
│  Inherent: 87%                     │                       │
└─────────────────────────────────────────────────────────┘
```

**How to read the gap:**
- **Inherent 87% → Residual 69%**: The vendor handles critical/restricted data but their controls have gaps. The residual score (69%, Amber) confirms that risk is *partially* mitigated but follow-up is needed. The 18-point gap is the "verified risk position" — it tells you exactly what your assessment uncovered.
- **Inherent 87% → Residual 92%**: The vendor is inherently high-risk in profile but their actual controls are strong. The residual score (92%, Green) indicates the risk is well-managed.
- **Inherent 55% → Residual 55%**: A medium-risk vendor with no completed assessments yet shares the inherent score as the best available estimate.

The residual score is only available after at least one assessment is **completed** (reviewer-finalized). Until then, the inherent risk is the primary risk indicator.

## Compliance Radar

The **compliance radar** (on the vendor's framework page, above the control heatmap) plots the same weighted score — but broken down **per domain** of a single framework. Where the heatmap shows each control individually, the radar gives you an at-a-glance shape of which *areas* of the framework are strong or weak.

### Axes

Each axis is one **domain** of the selected framework:

- **ISO 27001** — A.5 Organizational, A.6 People, A.7 Physical, A.8 Technological
- **NIST CSF** — Govern, Identify, Protect, Detect, Respond, Recover
- **SOC 2** — the Trust Services Criteria (CC1–CC9, Availability, Confidentiality, etc.)
- **Essential Eight** — the eight mitigation strategies
- **Your own frameworks** — whatever `domain` value you assign to each control on import

### Data source

The radar reads the two most recent **completed** assessments (status *not* in Draft / Sent / In Progress) whose questions map to that framework's controls:

- **Current** — the latest such assessment
- **Previous** — the one before it (only if it also mapped questions to this framework)

If there is only one completed assessment, the radar renders a single series with a note — no fabricated "previous" data.

### Weighting

The radar applies the exact same risk-weight formula as the overall score (see [Step 4](#step-4-apply-the-risk-weight)), but computed **within each domain**:

```
domainScore = sum(compliant weights in that domain) / sum(all weights in that domain)
```

Where each question's weight is `CRITICAL` = 10, `HIGH` = 6, `MEDIUM` = 3, `LOW` = 1 (configurable in Settings → Scoring). A CRITICAL control you fail pulls its domain's axis down far harder than a LOW control you fail — so the radar reads as a **residual risk rating**, not a flat compliance %.

The same exclusions apply as the overall score:

- **N/A responses** — excluded from numerator and denominator
- **Unscorable types** (`FREE_TEXT`, `FILE_UPLOAD`, `DATE`, `URL`, `EMAIL`) — excluded, since they have no machine-evaluable "right answer"
- **A question mapped to multiple controls** counts against each control's domain
- **Domains with no scorable questions** are omitted from the radar (so "not assessed" is never misread as 0%)

### Scale

The radius axis is a fixed **0–100%** scale. A "50%" always occupies the same position, so radars are directly comparable across frameworks and vendors.

### Current vs previous overlay

- **Solid polygon** = the current assessment
- **Dashed polygon** = the previous assessment
- A domain that was not assessed in the previous round appears as a gap in the dashed polygon

A shrinking polygon over time means a vendor is deteriorating; a growing one means their controls are improving.

## Findings Reconciliation

After scoring, the engine reconciles findings — the non-compliant answers that need attention:

### Auto-Findings

For each **non-compliant** auto-scored response:
- A `Finding` record is created (or updated if one already exists for that response)
- **Severity** is derived from the question's risk weight (CRITICAL finding for a CRITICAL-weighted question, etc.)
- **Control codes** are populated from the question's framework mappings (e.g., ISO 27001 A.5.3, SOC 2 CC6.1)
- **Title** and **description** are populated from the question text and a standard message

### Reconciliation Behaviour

When the scoring engine re-runs (vendor resubmits, reviewer finalizes after a send-back):

| Scenario | Behaviour |
|---|---|
| Response was **non-compliant, still non-compliant** | Finding upserted — status/resolution note preserved |
| Response was **non-compliant, now compliant** | Finding deleted **only if** its status is `OPEN` |
| Response was **non-compliant, now compliant**, finding is `RISK_ACCEPTED` or `REMEDIATED` | Finding **preserved** — reviewer's decision stands |
| Response is **newly non-compliant** | New finding created with `OPEN` status |
| **Manual finding** (no responseId) | Never touched by reconciliation |

> **Key design decision:** Once a reviewer accepts a risk or marks it as remediated, the engine will not re-open it. Only `OPEN` findings are automatically cleaned up when the underlying answer becomes compliant. This prevents the system from undoing deliberate reviewer decisions.

### Manual Findings

Reviewers can create findings that are not tied to any auto-scored response:
- Unscorable responses (free text, file uploads) that contain concerning content
- Issues observed during review that are not question-specific
- General observations about the vendor's posture

Manual findings have no `responseId` and are completely unaffected by scoring reconciliation — they persist until manually updated or deleted.

## Vendor Aggregate Score

After each assessment is scored, the vendor's `overallScore` is recalculated as the **average of all completed assessments** for that vendor:

```
vendor.overallScore = avg(score of all COMPLETED assessments)
```

- Only `COMPLETED` assessments contribute — drafts, in-progress, and submitted-but-unreviewed assessments are excluded
- The `lastAssessedAt` timestamp is updated to the most recent `submittedAt`
- If a vendor has no completed assessments, `overallScore` is `null`

This means the vendor's displayed score on the vendor list and dashboard reflects the **most current residual risk picture** across all questionnaires sent to that vendor.

## Dashboard & Visualizations

The scoring system feeds multiple dashboard views:

| View | What it shows |
|---|---|
| **Vendor list** | Overall score per vendor as RAG-colored percentage badge |
| **Dashboard donut** | RAG distribution across all scored vendors (Green/Amber/Red/Unscored) |
| **Dashboard bar** | Findings broken down by severity (CRITICAL/HIGH/MEDIUM/LOW) |
| **Risk by Tier** | Stacked RAG bars per vendor tier — see which tiers concentrate your risk |
| **Vendor Detail** | Inherent vs residual side-by-side, score history timeline, trend direction |
| **Framework Heatmap** | Per-control compliance ratio with RAG-coloured indicators |
| **Compliance Radar** | Risk-weighted domain compliance (0–100%) per framework, overlaying the current vs previous assessment |
| **Domain Breakdown** | Risk-weighted compliance percentage per domain, grouped by framework |

### Trend Direction

The vendor's score history is analysed with a linear regression to determine trend:
- **Up** (slope > +0.005): Score improving over time — vendor is addressing findings
- **Stable** (slope between ±0.005): No meaningful change
- **Down** (slope < −0.005): Score deteriorating — may need escalation

## Configurable Parameters

All scoring parameters are managed in-app under **Settings → Scoring** (requires **Settings: manage** permission):

| Parameter | Default | Range |
|---|---|---|
| **CRITICAL weight** | 10 | Numeric (min 0) |
| **HIGH weight** | 6 | Numeric (min 0) |
| **MEDIUM weight** | 3 | Numeric (min 0) |
| **LOW weight** | 1 | Numeric (min 0) |
| **Green threshold** | 0.85 | 0–1 |
| **Amber threshold** | 0.60 | 0–1 |
| **Exclude N/A** | Enabled | Toggle |

RAG visual colours are configured separately under Settings → Appearance.

## Scoring via the API

The REST API exposes scores and findings:

| Endpoint | What it returns |
|---|---|
| `GET /api/v1/vendors` | List with `overallScore` per vendor |
| `GET /api/v1/vendors/{id}` | Inherent risk score, residual score, assessment history |
| `GET /api/v1/vendors/{id}/score` | Current score, trend, score history array |
| `GET /api/v1/assessments/{id}` | Assessment score, per-response compliance, linked findings |
| `GET /api/v1/dashboard` | RAG distribution (green/amber/red counts + percentages), average portfolio score, open findings by severity |
| `GET /api/v1/findings` | Filter by vendor, framework, severity, status |

See the [API Reference](../api-reference/overview) for full request/response schemas. The interactive Swagger UI at `/docs` provides live API documentation.

## Summary

| Concept | What it measures | How it's computed | When it updates |
|---|---|---|---|
| **Inherent Risk** | Pre-assessment risk from vendor profile | Weighted average of tier + data sensitivity, adjusted by contract value and geography | On vendor create/update |
| **Assessment Score** | Compliance on a single questionnaire | Weighted ratio of compliant answers | On assessment finalization |
| **Residual Risk** | Post-assessment risk (the complement of the score) | `1 − assessmentScore` | On assessment finalization |
| **Vendor Overall Score** | Average compliance across all assessments | Mean of all completed assessment scores | On each assessment finalization |
| **Finding** | A specific non-compliant answer or observation | Auto-generated per non-compliant response or manually created | On assessment finalization |
| **Trend** | Direction of score movement over time | Linear regression on score history | On each assessment finalization |
