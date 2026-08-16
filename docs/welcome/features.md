# Features

Mitch‑Risk is a self-hosted third party vendor risk management solution. Here's everything it can do.

---

## Questionnaires

- **12 question types** — YES_NO, MULTIPLE_CHOICE, MULTI_SELECT, COMBOBOX, CHECKBOX, FREE_TEXT, URL, EMAIL, DATE, NUMERIC, RATING, FILE_UPLOAD
- **WYSIWYG Markdown editor** for question help text with live preview
- **Conditional logic** with match-all (AND) and match-any (OR) rule groups and 10 operators (equals, not equals, contains, not contains, >, <, ≥, ≤, answered, not answered)
- **Template versioning** — publish, unpublish, version, and duplicate templates
- **JSON import/export** via step-by-step wizard for template portability
- **Full out-of-the-box questionnaires** for NIST CSF 2.0, ISO 27001, SOC 2, and Essential Eight — one auto-scored question per control
- **Reorder** sections and questions with ↑/↓ buttons
- **Template preview** — see the questionnaire as the vendor will see it

## Vendor Portal

- **No-login secure links** with 256-bit opaque tokens (SHA-256 hashed)
- **Rich Markdown help text** rendered for each question
- **Optional password gate** (bcrypt at 12 rounds)
- **Auto-save** with progress persistence and resume capability
- **Expiry and revocation** — revoke a link and it stops working immediately
- **Conditional question visibility** — questions show/hide based on previous answers with smooth CSS transitions

## Vendors

- **CSV bulk import/export** with upsert support
- **External ID** field to cross-reference vendors in other systems
- **Drag-and-drop file upload** for attachments and certifications
- **Vendor detail pages** with tabs: Overview, Compliance, Findings, Assessments
- **Risk owner, data sensitivity, service description, contract renewal date**
- **Custom tags** for grouping and filtering
- **Side-by-side vendor comparison**
- **Bulk send** assessments to multiple vendors via 3-step wizard
- **Rows/Cards view toggle** (persisted per browser)

## Scoring & Compliance

- **Weighted RAG scoring** with configurable thresholds
- **4 risk weights** per question (Critical, High, Medium, Low)
- **Maps answers to** ISO 27001:2022 (93 controls), SOC 2 (51 TSC), NIST CSF 2.0 (129 subcategories), and Essential Eight (55 controls)
- **Auto-generates findings** from non-compliant answers
- **Domain-level compliance heatmaps** per vendor per framework
- **Per-framework control compliance view** with red/amber/green per control
- **Compliance radar chart** per framework — risk-weighted domain compliance with current vs previous assessment overlay
- **PDF compliance reports** per vendor/framework — domain compliance table (radar values) plus per-control heatmap, ready for auditors
- **Framework gap report** — which controls have no question coverage across all templates

## Customer Responsibility Tracking

- **Shared responsibility checklist** per vendor certification
- **Auto-generated** when a certification is saved with "Compliance actions required"
- **Track your obligations** — SOC 2 requires you to enforce MFA, conduct access reviews, classify data, and more
- **Statuses:** Pending, In Progress, Completed, Not Applicable
- **Assign to team members**, add notes, attach evidence
- **Progress bar** per certification with RAG colouring
- **Split compliance view** — Vendor compliance + Your compliance side by side
- **Risk register integration** — filter to see all responsibility actions across vendors
- **Admin-controlled** — mark any control in any framework as shared responsibility
- **CSV framework import** supports `is_shared_responsibility` column

## Review & Collaboration

- **Review decisions** — Approve each answer or Request clarification
- **Threaded comments** with vendor visibility controls (Internal / Visible to vendor)
- **Collapsible review panel** on assessment detail
- **Send back to vendor** workflow for corrections and resubmission
- **Per-question review progress** with expand/collapse toggles
- **Reviewer notification** email on submission

## Findings & Risk Register

- **Cross-vendor risk register** — every finding across all vendors in one place
- **Auto-generated findings** from non-compliant assessment answers
- **Status lifecycle** — Open, Remediated, Risk Accepted
- **Resolution notes** and resolver tracking
- **Filter by** severity, status, vendor, framework
- **Bulk status update** via checkbox selection toolbar
- **Customer responsibility actions** — surface alongside findings with filter toggle

## Dashboard & Reporting

- **Portfolio metrics** with animated count-up stat cards
- **Donut chart** of vendor risk distribution (RAG)
- **Bar chart** of findings by severity
- **Assessment activity timeline** with time-range selector (7d/30d/90d)
- **Expandable "Needs attention" groups** — overdue, below threshold
- **Highest-risk vendors** top-6 card
- **Upcoming key dates** — cert expiries, contract renewals, reassessments
- **PDF assessment reports** and **CSV exports**
- **Sortable, filterable data tables** across vendors, assessments, findings, and audit log
- **Sticky header** and **scroll-to-top** button

## Certifications & Key Dates

- **Record vendor certifications** — SOC 2, ISO 27001, and custom attestations
- **Expiry tracking** with Valid / Expiring Soon / Expired status badges
- **Cron-sent reminders** at 30 and 7 days before expiry to the risk owner
- **Contract renewal date** tracking with overdue flag
- **Evidence attachment** for certification documents (SOC 2 reports, ISO certificates)

## API

- **REST v1** under `/api/v1/` — vendors, assessments, findings, frameworks, dashboard, audit
- **Session cookie auth** (web login) + **API key auth** (Bearer tokens)
- **Full-access API keys** — independent of creating account, survive user deletion
- **Per-key permission scoping** with 23 resource:action permissions
- **IP allowlisting** with IPv4/IPv6 CIDR support
- **Configurable API key expiry** (30/90/180/365 days or permanent)
- **Rate limiting** per API key
- **Interactive Swagger UI** at `/docs`

## Webhooks

- **5 event types** — ASSESSMENT_SUBMITTED, ASSESSMENT_OVERDUE, FINDING_CREATED, FINDING_RESOLVED, CERTIFICATION_EXPIRING
- **HMAC-SHA256 signed** payloads with per-endpoint secrets
- **Platform presets** — Generic JSON, Slack Block Kit, Microsoft Teams Adaptive Card, Discord Embed
- **Configurable** in Settings → Webhooks (Admin only)

## Access Control

- **3 system roles** — Admin (all permissions, locked), Reviewer (write + review), Viewer (read-only)
- **Custom roles** with any subset of 23 resource:action permissions
- **Permission enforcement** on every server action, API route, and page
- **UI controls hidden** (not greyed) — Viewer sees a clean read-only screen
- **Sidebar** and **Settings tabs** permission-filtered
- **SSO** — Microsoft Entra ID, Google Workspace, and generic OIDC providers
- **SSO-only mode** with break-glass emergency access

## Email

- **SMTP provider-agnostic** — SendGrid, Mailgun, custom SMTP
- **React Email templates** with configurable subject and body
- **Template types** — Invite, Reminder, Escalation, Submission notification, Clarification, Password reset, Expiry
- **Password-protected invite** template with inline password
- **Markdown-to-HTML** conversion at send time
- **Email tracking** tab with filterable sent/failed log and retry button
- **Test SMTP** button to verify configuration

## Automation (Cron)

- **Secured endpoint** — `POST /api/cron/run` with `CRON_SECRET` header
- **Vendor reminders** at configurable offsets before due date
- **Overdue escalation** with configurable threshold
- **Recurring assessments** — quarterly, annually
- **Certification expiry reminders** at 30 and 7 days
- **Contract renewal** reminders
- **Audit log pruning** and email log pruning
- **Orphaned file sweep** for unreferenced storage files

## Security

- **bcryptjs** at 12 rounds for passwords, API keys, break-glass tokens, and portal tokens
- **AES-256-GCM** encryption for SMTP credentials, SSO secrets, and cloud storage keys at rest
- **Nonce-based strict-dynamic Content Security Policy**
- **Server-enforced JWT session expiry** with sliding-window refresh and configurable timeout
- **Non-root container** (`USER node`) with resource limits in Docker Compose
- **Break-glass emergency access** with 24-hour expiry and single-use consumption
- **Magic-byte file signature validation** on all uploads
- **Rate limiting** on login, portal, API, file uploads, password reset, and break-glass
- **Proxy-aware client IP** resolution (trusted-hop `X-Forwarded-For`)

## Storage

- **Local disk** (default) — configurable path
- **AWS S3** and **Azure Blob Storage** — configure via Settings → Storage
- **Single storage interface** — save, read, delete, list
- **Polymorphic attachment model** — evidence attached to any entity
- **Evidence preview** for PDFs and images in a slide-out sheet

## Deployment

- **Docker Compose** (app + PostgreSQL) for self-hosted deployments
- **Pre-built image** from GitHub Container Registry (`ghcr.io/mitchelljfranklin/mitch-risk`)
- **Portainer template** available for one-click stack deployment
- **Reverse proxy** support — Caddy, nginx, Zoraxy, Azure Application Gateway
- **Azure Container Apps** deployment guide
- **Auto-applied Prisma migrations** on container start
- **Idempotent seed** — frameworks, controls, starter + full questionnaires, and settings

## Self-Assessment

- **Self-assess** your own organisation against ISO 27001, SOC 2, NIST CSF, or Essential Eight
- **Same portal experience** as vendor assessments
- **Past assessments list** with scores and dates
- **Direct portal redirect** after creation
