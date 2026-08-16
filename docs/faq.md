# FAQ

## What compliance frameworks are supported?

ISO 27001:2022 (93 Annex A controls), SOC 2 (51 Trust Services Criteria), NIST CSF 2.0 (129 subcategories), and Essential Eight (55 controls with maturity levels). All four ship as seed data with a complete, pre-built questionnaire each, and can be mapped to your own assessment questions.

## How do vendors access their questionnaire?

Vendors receive an email with a unique, secure portal link (`/portal/<token>`). No login or account is required. The token is 256-bit random, SHA-256 hashed in the database, and expires after a configurable period (default 30 days).

## Can I add a password to the vendor portal?

Yes. Set an optional portal password when sending the assessment. Vendors must enter the password (included in the invite email) before accessing the questionnaire. Password attempts are rate-limited (5/min default).

## How is the scoring calculated?

Each question has a risk weight (Critical=10, High=6, Medium=3, Low=1). Compliant answers earn the full weight; non-compliant answers earn 0. The total score is `sum(weightedScores) / sum(maxScores)`, yielding a 0–1 ratio (displayed as 0–100%). Only auto-scorable question types (Yes/No, Multiple Choice, Numeric, Combo Box, Multi-Select, Rating, Checkbox) are included — free text and file uploads require manual review.

RAG thresholds: Green ≥85%, Amber 60–84%, Red <60%.

For a complete explanation — including inherent risk, residual risk, worked examples, findings reconciliation, and configurable parameters — see the [Scoring Methodology](./user-guides/scoring) guide.

## How do I set up SSO (Single Sign-On)?

SSO is configured in Settings → SSO. Microsoft Entra ID, Google, and generic OIDC providers are supported. See the [SSO Configuration](./configuration/sso) guide for per-provider setup instructions.

## How do I configure email?

Go to Settings → Email. Enter your SMTP server details (host, port, username, from address). The SMTP password is encrypted at rest with AES-256-GCM. Use the test button to verify the configuration. Email templates can be customized with `{{tokens}}` for vendor name, assessment title, portal URL, due date, and other dynamic values.

## What happens to files when I delete a record?

Deleting a vendor or assessment deletes all associated evidence files and attachments from storage. Replacing an uploaded file deletes the old file. A cron job sweeps for orphaned files as a backstop. Files are deleted from the configured storage provider (local disk, S3, or Azure Blob).

## How do recurring assessments work?

Set a recurrence schedule (Quarterly or Annual) when creating an assessment. The cron job automatically creates the next assessment when the current one completes or when the next scheduled date arrives. Each recurrence uses the same template and vendor.

## What does the cron job do?

The cron endpoint (`/api/cron/run`) triggers:
- Vendor reminder emails (based on assessment due date and reminder offset)
- Escalation emails to reviewers for overdue assessments
- Recurring assessment creation
- Certification and contract expiry notifications (7 and 30 days)
- Audit log pruning (based on retention setting)
- Email log pruning (default 14 days)
- Orphaned file sweep (files unreferenced for >1 hour)

## How do I back up?

Back up two things together:
1. **Database** — use `scripts/backup.sh` or `scripts/backup.ps1` (creates timestamped `pg_dump` file, auto-rotates last 7).
2. **Files** — back up the `evidence_data` volume or cloud bucket (evidence, logos, attachments).

A database-only backup leaves files orphaned; a files-only backup loses the links. Always capture both.

## Can I load demo data?

Yes. Run the seed script: `npm run db:seed`. This creates the framework libraries, complete questionnaires (plus starter templates), and default settings. For full demo data with sample vendors, assessments, and findings, run:

```bash
npx tsx prisma/seed-demo.ts
``` The seed is idempotent — running it multiple times won't duplicate data.

## Can I extend or customize the platform?

The platform is open source. You can modify the code, add new framework libraries via CSV import, create custom roles with any permission combination, and swap the storage backend. The REST API integrates with external systems. The architecture is designed around a pluggable storage interface and configurable scoring engine. For extensions that would benefit the community, pull requests are welcome.
