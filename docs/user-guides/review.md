# Review & Findings

After a vendor submits their assessment, the review process begins. Reviewers examine responses, make decisions, collaborate through comments, and manage the findings that result from non-compliant answers.

## Review Workflow

### Per-Question Review

Each response can be individually reviewed:

1. Open the assessment and enter **Under Review** status.
2. For each question, the reviewer can:
   - **Approve** — accept the answer as compliant
   - **Request Clarification** — send the assessment back to the vendor with a note
3. After all questions are reviewed, **finalize** the assessment to complete it.

### Send Back to Vendor

When a reviewer requests clarification:
- The assessment transitions to `IN_PROGRESS`
- The portal reopens for the vendor
- The vendor can edit their response and re-submit
- The reviewer's clarification note is visible to the vendor
- This loop can repeat as needed until the reviewer approves

### Finalizing

When the reviewer finalizes the assessment:
- Status changes to `COMPLETED`
- Scoring engine runs and generates/updates findings
- Vendor's overall score is updated
- Audit trail records the finalization

## Comments

Comments support collaboration between reviewers and vendors:

| Visibility | Visible To | Use Case |
|------------|------------|----------|
| **Internal** | Staff only | Reviewer notes, team discussion, risk decisions |
| **Vendor** | Staff + Vendor (read-only in portal) | Clarification requests, feedback on answers |

- Comments are **threaded** — reply to existing comments
- Comments are **per-question** — each question has its own comment thread
- Internal comments are **never** rendered in the vendor portal
- After submission, vendors can still view vendor-visible comments

## Findings

### Findings Lifecycle

```
    ┌──────────┐
    │   OPEN   │
    └────┬─────┘
         │
    ┌────┴─────────┐
    ▼              ▼
┌──────────┐  ┌──────────────┐
│REMEDIATED│  │RISK_ACCEPTED │
└──────────┘  └──────────────┘
```

| Status | Meaning |
|--------|---------|
| `OPEN` | Finding is unresolved — requires action |
| `REMEDIATED` | Vendor has addressed the issue |
| `RISK_ACCEPTED` | Reviewer has accepted the risk without remediation |

### Auto-Generated Findings

When the scoring engine runs after review completion:
- Each **non-compliant** auto-scored response generates a finding
- The finding includes the response, question text, control codes, and severity
- **Severity** is derived from the question's risk weight (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`)
- Auto-findings are **upserted** — if a finding already exists for that response, it is updated rather than duplicated

### Manual Findings

Reviewers can create manual findings for:
- Unscorable responses (free text, file uploads) that need follow-up
- Issues not tied to a specific question
- Observations during review not captured by auto-scoring

Manual findings have no `responseId` and are never affected by scoring reconciliation.

### Findings Reconciliation Behavior

When the scoring engine re-runs (e.g. after a re-review):
- **Upsert, don't overwrite** — existing reviewer decisions are preserved
- **Reviewer-set status** and **resolution note** are retained
- **Compliant now** — findings for responses that became compliant are deleted
- **New non-compliance** — findings are created for newly non-compliant responses

## Risk Register

The Risk Register provides a **cross-vendor view** of all findings:

- **Filter** by vendor, framework, severity, status, date range
- **Sort** by severity, date, vendor, control code
- **Severity-accented cards** showing finding details at a glance
- **Inline status updates** — change finding status directly from the register
- **Export** — download findings as CSV
- **Linked** — click through to the assessment and vendor detail

The Risk Register aggregates findings from all vendors, making it the central place to track outstanding risks across your vendor portfolio.
