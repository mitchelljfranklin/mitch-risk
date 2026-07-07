# Assessments

Assessments are questionnaires sent to vendors. They freeze a template's questions at creation time and track the vendor's responses through a lifecycle from draft to completion.

## Lifecycle

```
    ┌──────────┐
    │  DRAFT   │
    └────┬─────┘
         │ Send (token generated, email sent)
    ┌────▼──────┐
    │   SENT    │──────────────────────────────┐
    └────┬──────┘                              │
         │ Vendor opens portal link            │ Overdue if past
    ┌────▼──────────┐                          │ due date
    │  IN_PROGRESS  │◄─────────────┐           │
    └────┬──────────┘              │           │
         │ Vendor submits          │           │
    ┌────▼──────┐    Reviewer      │           │
    │ SUBMITTED │    requests      │           │
    └────┬──────┘    clarification │           │
         │─────────────────────────┘     ┌─────▼─────┐
    ┌────▼──────┐                        │  OVERDUE  │
    │UNDER_REVIEW│                       └───────────┘
    └────┬──────┘
         │ Reviewer finalizes
    ┌────▼──────┐
    │ COMPLETED │
    └───────────┘
```

## Status Meanings

| Status | Meaning |
|--------|---------|
| `DRAFT` | Assessment created but not yet sent to vendor |
| `SENT` | Token generated, email dispatched, vendor has not opened the link |
| `IN_PROGRESS` | Vendor has opened the portal and started answering |
| `SUBMITTED` | Vendor has submitted all answers; portal is now read-only |
| `UNDER_REVIEW` | Reviewer has opened the assessment for review |
| `COMPLETED` | Review finalized, score calculated, findings generated |
| `OVERDUE` | Past the due date while still in SENT or IN_PROGRESS (set by cron) |

## Sending an Assessment

1. Create an assessment from a published template and select a vendor.
2. Set a due date. Optionally set a portal password or recurrence schedule.
3. Click **Send**. The platform:
   - Generates a 256-bit opaque token for the portal URL
   - SHA-256 hashes the token for database lookup
   - Sends the invite email (with password if set)
   - Logs the send in the audit trail and notification log
4. The vendor receives an email with the portal link: `https://app.example.com/portal/<token>`
5. Tokens can be revoked or regenerated at any time from the assessment detail page.

## Portal Access

The vendor portal is a no-login experience:
- **Token in URL** provides access — 43-character base64url string
- **Optional password gate** — bcrypt-hashed, rate-limited (5 attempts/min default)
- **Auto-save** — progress is persisted as the vendor answers
- **Conditional logic** — only relevant questions are shown
- **Read-only after submission** — vendor can view their answers but not edit
- **Send-back-to-vendor** — reviewer can reopen the portal for clarification

## Recurring Assessments

Assessments can be set to recur automatically:

| Schedule | Behavior |
|----------|----------|
| **None** | One-time assessment (default) |
| **Quarterly** | New assessment created automatically every 3 months |
| **Annual** | New assessment created automatically every 12 months |

The cron job (`/api/cron/run`) creates the next assessment when the current one is completed or when the next scheduled date arrives. Each recurrence inherits the same template and vendor.

## Scoring Engine

### How Scoring Works

The scoring engine evaluates each response against its question's expected answer:

1. **Exclude unscorable questions** — `FREE_TEXT`, `FILE_UPLOAD`, `DATE`, `URL`, `EMAIL` types are excluded (returned as `null` compliance).
2. **Exclude N/A responses** — questions marked "Not Applicable" by the vendor are excluded from the score.
3. **Compare each scorable response** against its expected answer.
4. **Apply risk weight** — compliant response earns the full weight; non-compliant earns 0.
5. **Calculate total** — `totalScore = sum(weightedScores) / sum(maxScores)`, yielding a 0–1 ratio.

### RAG Classification

Scores are classified into Red/Amber/Green bands:

| Classification | Score Range | Color |
|----------------|:-----------:|:-----:|
| **Green** | ≥ 85% | Compliant — low risk |
| **Amber** | 60% – 84% | Partially compliant — medium risk |
| **Red** | < 60% | Non-compliant — high risk |
| **Unscored** | No scorable questions | No data — no auto-score possible |

RAG thresholds and risk weight values are configurable in Settings → Scoring.

### Findings Reconciliation

After scoring, the engine reconciles findings:
- **Auto-findings** are upserted for each non-compliant auto-scored response (keyed by `responseId`)
- **Manual findings** (created by reviewers) are untouched — they have no `responseId`
- **Reviewer decisions** (`status`, `resolutionNote`, `resolvedById`) are preserved on upsert
- **Complaint findings** from previous runs are cleaned up when the response becomes compliant
- **Vendor overall score** is updated after reconciliation

## Assessment Detail View

The assessment detail page shows:
- **Status and metadata** — current phase, due date, sent date, submitted date, recurrence
- **Score summary** — RAG badge, overall percentage, breakdown by domain
- **Question list** — all questions with vendor answers and review decisions
- **Review panel** — collapsible per-question review with approve/clarify actions
- **Comments** — threaded, per-question, with internal/vendor visibility control
- **Findings panel** — linked findings with status and control codes
- **Evidence** — uploaded files with download links
- **Activity timeline** — chronological log of all assessment events
