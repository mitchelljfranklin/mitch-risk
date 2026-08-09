# Mitch‑Risk

[![CI](https://img.shields.io/github/actions/workflow/status/mitchelljfranklin/mitch-risk/ci.yml?branch=master)](https://github.com/mitchelljfranklin/mitch-risk/actions)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-brightgreen)](LICENSE)
[![Security Audited](https://img.shields.io/badge/security-audited-2563eb)](APPSECURITY.md)

> A self-hosted third party vendor risk management solution. Free, open-source, deploy anywhere.

---

## Why Mitch‑Risk

The vendor risk management market is well-served by mature SaaS platforms — UpGuard, OneTrust, Vanta, and others offer deep feature sets, global threat intelligence, and enterprise compliance automation. These are excellent products built by talented teams.

But that value comes at a cost — the subscription, the onboarding overhead, the learning curve that assumes you already know what a SOC 2 Type II report looks like. For a small IT team managing an aged care provider, a not-for-profit, or a growing startup, that barrier is real.

Mitch‑Risk bridges that gap. It strips third party vendor risk management down to its essentials: build a questionnaire, send it, score the answers, track compliance over time. No AI risk scoring, no vendor universe crawling, no board reporting module. Just the core workflow, done well, running in Docker Compose.

> **Security-hardened.** Mitch‑Risk has undergone a comprehensive security audit — 55 findings across 4 severity levels. 52 items resolved (fixed or dismissed), 3 deferred or monitored. [Read the full report](APPSECURITY.md).

---

## Quick Start

### Pre-built image (recommended)

```bash
curl -O https://raw.githubusercontent.com/mitchelljfranklin/mitch-risk/master/docker-compose.pull.yml
# Create a .env file with your secrets:
cat > .env << 'EOF'
POSTGRES_PASSWORD=<a-strong-db-password>
AUTH_SECRET=<your-secret>
APP_ENCRYPTION_KEY=<your-key-min-32-chars>
CRON_SECRET=<your-secret>
APP_URL=http://localhost:3000
EOF

docker compose -f docker-compose.pull.yml up -d
# Open http://localhost:3000/setup to create your admin account
```

### Build from source

```bash
git clone https://github.com/mitchelljfranklin/mitch-risk.git
cd mitch-risk
cp .env.example .env
# Edit .env with your own AUTH_SECRET, APP_ENCRYPTION_KEY, and CRON_SECRET

docker compose up -d
# Open http://localhost:3000/setup to create your admin account
```

---

## Features

### Questionnaires
- 12 question types: yes/no, multiple choice, checkbox grids, numeric ranges, free text, file uploads, and more
- WYSIWYG Markdown editor for question help text with live preview
- Conditional logic with match-all/match-any rule groups
- Publish, unpublish, version, and duplicate templates
- JSON import/export via step-by-step wizard for template portability

### Vendor Portal
- No-login secure links with 256-bit opaque tokens (SHA-256 hashed)
- Rich Markdown help text rendered for each question
- Optional password gate (bcrypt at 12 rounds)
- Auto-save with progress persistence and resume capability
- Expiry and revocation — revoke a link and it stops working immediately

### Vendors
- CSV bulk import/export with upsert support (include `id` column to update existing vendors)
- Drag-and-drop file upload for attachments and certifications
- Vendor detail pages with certifications, attachments, assessments, and framework compliance views
- Side-by-side vendor comparison
- Bulk send assessments to multiple vendors via 3-step wizard

### Scoring & Compliance
- Weighted RAG scoring engine with configurable thresholds
- Maps answers to ISO 27001:2022 (93 controls), SOC 2 (51 TSC), NIST CSF 2.0 (129 subcategories), and Essential Eight (55 controls)
- Auto-generates findings from non-compliant answers
- Domain-level compliance heatmaps per vendor per framework

### Review & Collaboration
- Approve, reject, or request clarification on each vendor answer
- Threaded comments with vendor visibility controls
- Collapsible review panel on assessment detail
- Send back to vendor workflow for corrections and resubmission

### Risk Register
- Cross-vendor view of all findings with severity-accented cards
- Inline finding status updates (Open, Remediated, Risk Accepted)
- Filter by severity, status, vendor, or framework

### Self-Assessment
- Assess your own organization using built-in questionnaires
- One-click "My Organization" vendor record with quick assessment creation
- Same question types and scoring engine — track your progress over time
- Results appear alongside vendor scores on the dashboard

### Dashboard & Reporting
- Portfolio metrics with animated count-up stat cards
- Donut chart of vendor risk distribution, bar chart of findings by severity
- Assessment activity timeline with time-range selector
- Sortable, filterable data tables across vendors, assessments, findings, and audit log
- PDF assessment reports and CSV exports

### API
- REST v1 under `/api/v1/` — vendors, assessments, findings, frameworks, dashboard, audit
- Session cookie auth (web login) + API key auth (Bearer tokens) with per-key permission scoping
- IP allowlisting with IPv4/IPv6 CIDR support
- Configurable API key expiry (30/90/180/365 days or permanent)
- Interactive Swagger UI at `/docs`

### Webhooks
- Outbound event notifications for assessments submitted, findings changed, certifications expiring
- HMAC-SHA256 signed payloads with per-endpoint secrets
- Configured in Settings → Webhooks (Admin only)
- 5 event types: ASSESSMENT_SUBMITTED, ASSESSMENT_OVERDUE, FINDING_CREATED, FINDING_RESOLVED, CERTIFICATION_EXPIRING

### Inherent Risk
- Pre-assessment risk score based on vendor tier, data sensitivity, contract value, and geographic risk
- Displayed alongside residual (post-assessment) score on vendor detail pages
- Contract value and geographic risk fields on vendor create/edit forms

### Customer Responsibility Tracking
- Auto-generated checklists of your obligations when vendors hold SOC 2 or ISO 27001 certifications
- Track status (Pending / In Progress / Completed / Not Applicable) per control
- Assign items to team members, add notes, attach evidence files
- Split compliance view — Vendor compliance + Your compliance side by side
- Risk register integration — filter to see all responsibility actions across vendors
- Admin-controlled shared responsibility markers on framework controls
- CSV framework import supports `is_shared_responsibility` column
- SOC 2 ships with 13 controls pre-marked as shared responsibility

### Access Control
- 3 system roles (Admin, Reviewer, Viewer) + custom roles
- 23 granular `resource:action` permissions
- UI controls hidden (not greyed) — Viewer sees a clean read-only screen
- Sidebar navigation and settings tabs permission-filtered

### Security
- bcryptjs at 12 rounds for passwords, API keys, and break-glass tokens
- AES-256-GCM encryption at rest for SMTP credentials, SSO/OIDC client secrets, and cloud-storage access keys
- Nonce-based strict-dynamic Content Security Policy
- Server-enforced JWT session expiry with sliding-window refresh and configurable timeout
- Non-root container (`USER node`) with resource limits (CPU/memory) in Docker Compose
- Break-glass emergency access with 24-hour expiry and single-use consumption
- Magic-byte file signature validation on uploads with drag-and-drop UX
- Rate limiting on login, portal, API, file uploads, and password reset
- `AUTH_SECRET` minimum 32 characters enforced at boot

---

## Framework Libraries

| Framework | Version | Controls |
|-----------|---------|----------|
| ISO 27001 | 2022 | 93 Annex A controls |
| SOC 2 | 2020 | 51 Trust Services Criteria |
| NIST CSF | 2.0 | 129 subcategories across 6 functions |
| Essential Eight | — | 55 controls across 8 strategies |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 22 |
| Framework | Next.js 16 (App Router) + TypeScript ^6 |
| Database | PostgreSQL + Prisma ^7 |
| UI | Tailwind CSS v4 + shadcn/ui (light/dark) |
| Tables | @tanstack/react-table |
| Auth | Auth.js v5 (credentials + SSO) |
| Email | Nodemailer SMTP + React Email templates |
| Charts | recharts |
| Reports | @react-pdf/renderer |
| Markdown | @uiw/react-md-editor, react-markdown, marked |
| Deployment | Docker Compose |

---

## API

Authenticated REST API under `/api/v1/`. Authenticate via session cookie (web login) or Bearer token (API key generated in Settings → API).

| Resource | Endpoints |
|----------|-----------|
| **Vendors** | `GET/PUT/DELETE /api/v1/vendors/{id}`, list, import, export, score, assessments, certifications |
| **Assessments** | `GET /api/v1/assessments` (list with filters), `GET /api/v1/assessments/{id}` (full detail) |
| **Findings** | `GET /api/v1/findings` (filters: status, severity, vendor), `PATCH /api/v1/findings/{id}` (status update) |
| **Frameworks** | `GET /api/v1/frameworks` (list), `GET /api/v1/frameworks/{id}` (detail with controls), `DELETE /api/v1/frameworks/{id}` (delete) |
| **Dashboard** | `GET /api/v1/dashboard` — portfolio metrics, RAG distribution, top deficient controls |
| **Audit** | `GET /api/v1/audit` — paginated, filterable audit log (JSON or CSV) |

Files served through authenticated `GET /api/attachments/{id}`. Full interactive docs: **http://localhost:3000/docs**.

---

<details>
<summary><strong>Reverse Proxy Configuration</strong></summary>

The app is designed to run behind a TLS-terminating reverse proxy (Caddy, nginx, Zorazy, Azure Application Gateway, etc.). Auth.js runs with `trustHost` enabled.

**Your proxy must forward:**
- `Host` / `X-Forwarded-Host` — public hostname
- `X-Forwarded-Proto` — `https`
- `X-Forwarded-For` — client IP (for rate limiting and API key IP allowlists)

**Required configuration:**
- Set `APP_URL` to your public HTTPS URL (e.g. `https://risk.example.com`)
- Set `TRUSTED_PROXY_COUNT` to the number of trusted proxies (defaults to `0`; set to `1` behind a single proxy like Caddy/nginx)
- Do not expose port 3000 publicly — route only through the proxy
- `AUTH_URL` defaults to `APP_URL`; set explicitly only if auth must use a different origin

**Caddy** (`Caddyfile`, `TRUSTED_PROXY_COUNT=1`):
```caddy
risk.example.com {
    reverse_proxy app:3000
}
```

**nginx** (`TRUSTED_PROXY_COUNT=1`):
```nginx
server {
    listen 443 ssl;
    server_name risk.example.com;
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

</details>

---

## Operations

### Cron

```bash
curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/run
```

Triggers: vendor reminders, overdue escalations, recurring assessments, certification/contract expiry notices, audit log pruning, email log pruning, and orphaned file sweep.

### Testing

Integration tests hit a real PostgreSQL database and delete/reset data. Run against a dedicated test database:

```bash
# Create and migrate the test database
docker compose exec db createdb -U mitch mitch_risk_test
DATABASE_URL="postgresql://mitch:mitch@localhost:5432/mitch_risk_test?schema=public" npx prisma migrate deploy

# Run tests
TEST_DATABASE_URL="postgresql://mitch:mitch@localhost:5432/mitch_risk_test?schema=public" npm run test
npm run test:e2e    # Playwright
```

### Backup

```bash
# Database
./scripts/backup.sh    # bash
.\scripts\backup.ps1   # PowerShell

# Evidence files
docker run --rm -v mitch-risk_evidence_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/evidence-$(date +%F).tar.gz -C /data .
```

> Do not run `docker compose down -v` unless you intend to wipe data.

---

## Documentation

| Document | Description |
|----------|-------------|
| [User Documentation](https://risk.mitchforge.com) | VitePress-powered site with guides, API reference, and deployment instructions |
| [Architecture](ARCHITECTURE.md) | Full platform architecture with diagrams |
| [Security](APPSECURITY.md) | Security architecture, hardening, and risk register |
| [Cloud Storage](STORAGE.md) | AWS S3 and Azure Blob configuration |
| [SSO](SSOConfig.md) | Entra ID, Google, and generic OIDC setup |
| [Security Policy](SECURITY.md) | Vulnerability reporting, supported versions, security model |
| [Privacy Policy](PRIVACY.md) | Data processing, retention, vendor portal privacy, cookies |

---

## Contributing

While I believe AI can be a powerful tool for development — and I personally use AI assistants to help manage documentation and reviews — it must remain a tool in the hands of a capable developer. In this project, **you are the pilot**; you are responsible for coding, confirming, and refining your contributions.

To help those using AI tools, I've created an [AGENTS.md](AGENTS.md) file specifically for your assistants to follow. Please ensure your agent adheres to these guidelines, as non-compliant code will be rejected regardless of how well it functions.

Most importantly, please ensure you **fully understand the code you are submitting**. A "black box" approach where AI generates code that the human contributor doesn't understand is not permitted here.
