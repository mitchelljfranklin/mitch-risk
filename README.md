# mitch-risk

A lightweight vendor risk management platform for small businesses.

## Quick start (Docker Compose)

```bash
# 1. Clone and set up env
cp .env.example .env
# Edit .env with your own AUTH_SECRET, APP_ENCRYPTION_KEY, and CRON_SECRET

# 2. Start the stack
docker compose up -d

# 3. Open http://localhost:3000/setup to create your admin account
```

## Stack

- **Next.js 16 + TypeScript** — full-stack (App Router)
- **PostgreSQL + Prisma** — typed ORM + migrations
- **Tailwind CSS v4 + shadcn/ui** — themed UI with light/dark modes
- **Auth.js v5** — internal staff auth (credentials + SSO)
- **Nodemailer SMTP** — vendor email (invites, reminders, escalations)
- **recharts** — dashboard charts
- **@react-pdf/renderer** — PDF assessment reports
- **Docker Compose** — self-hosted deployment

## Features

- Build, version, publish/unpublish security questionnaires (12 answer types)
- Send to vendors via no-login, expiring, password-protected secure links
- Bulk vendor onboarding (CSV import) and bulk assessment sending
- Auto-score responses with weighted RAG scoring
- Map answers to ISO 27001, SOC 2, NIST CSF 2.0, and Essential Eight controls
- Generate findings from non-compliant answers
- Track vendor risk profiles with trend history and domain compliance heatmaps
- Side-by-side vendor assessment comparison (same vendor or cross-vendor)
- Threaded reviewer/vendor collaboration with approve/reject/clarify workflow
- Dashboard with portfolio metrics, animated stat cards, donut/bar charts, calendar heatmap, and top deficient controls
- REST API with session + API key authentication (Bearer tokens, IP allowlisting)
- Interactive Swagger UI at `/docs`
- PDF reports and CSV exports
- In-app settings for all operational configuration (email, scoring, branding, scheduling)
- Reviewer notified by email when a vendor submits their questionnaire
- Email tracking with SENT/FAILED status, per-send logging, retry, and retention
- Keyboard shortcuts (`?` modal, `g`+letter navigation)
- Toast notification system
- Custom visual branding (logo, primary/secondary colours, RAG indicator colours, border radius, page width)
- Audit trail for all administrative actions

## Framework libraries

| Framework | Controls |
|-----------|----------|
| ISO 27001:2022 | 93 Annex A controls |
| SOC 2 | 51 Trust Services Criteria |
| NIST CSF 2.0 | 129 subcategories across 6 functions |
| Essential Eight | 55 controls across 8 strategies |

## API

Authenticated API endpoints under `/api/v1/`:
- `GET /api/v1/vendors` — list/search vendors
- `GET /api/v1/vendors/{id}` — vendor detail
- `GET /api/v1/vendors/{id}/score` — score summary
- `GET /api/v1/vendors/{id}/export` — download vendor CSV
- `GET /api/v1/audit` — query audit log (JSON or CSV, page-based pagination)

Full docs: **http://localhost:3000/docs** (authenticated)

## Configuration

All operational settings are managed in-app via **Settings** (ADMIN role) — no file editing needed after initial setup:
- Organization name, support email, logo, brand colours (Appearance tab)
- SMTP server credentials (encrypted at rest)
- Email templates with `{{tokens}}`
- Scoring weights and RAG thresholds
- Reminder offsets, escalation timing, assessment defaults (Configuration tab)
- API keys with IP allowlisting and expiry
- SSO providers (Entra ID, Google, OIDC)
- User management with roles ADMIN/REVIEWER

## Backup

```bash
# Bash
./scripts/backup.sh

# PowerShell
.\scripts\backup.ps1
```

## Cron

Schedule a system cron to hit the secured endpoint:

```bash
curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/run
```

This triggers: vendor reminders, overdue escalations, recurring assessment creation, and audit log pruning.
