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
- Cross-vendor risk register with severity-accented cards and inline finding status updates
- Vendor profile enrichment (risk owner, data sensitivity, service description, contract renewal)
- Certification tracking with expiry reminders (30/7-day windows)
- Multiple file attachments per vendor and certification
- Configurable external cloud storage (AWS S3, Azure Blob) with setup guide (`docs/STORAGE.md`)
- CSV framework import with downloadable template
- Demo data seed script for realistic testing
- Assessment activity timeline with time-range selector
- Collapsible review panel on assessment detail
- Sticky header and scroll-to-top button
- Dashboard with portfolio metrics, animated stat cards, donut/bar charts, calendar heatmap, and top deficient controls
- REST API with session + API key authentication (Bearer tokens, IP allowlisting)
- Interactive Swagger UI at `/docs`
- PDF reports and CSV exports
- In-app settings for all operational configuration (email, scoring, branding, scheduling)
- Configurable auto-logout after inactivity (default 30 min, adjustable or off)
- Reviewer notified by email when a vendor submits their questionnaire
- Email tracking with SENT/FAILED status, per-send logging, retry, and retention
- Keyboard shortcuts (`?` modal, `g`+letter navigation)
- Toast notification system
- Custom visual branding (logo, primary/secondary colours, RAG indicator colours, border radius, page width)
- Confirmation dialogs for all destructive actions (delete vendor, assessment, template, etc.)
- Vendor questionnaire auto-save with progress persistence and resume capability
- Audit trail for all administrative actions with entity names, meta context, configurable page size, and CSV export

## Framework libraries

| Framework | Controls |
|-----------|----------|
| ISO 27001:2022 | 93 Annex A controls |
| SOC 2 | 51 Trust Services Criteria |
| NIST CSF 2.0 | 129 subcategories across 6 functions |
| Essential Eight | 55 controls across 8 strategies |

## API

Authenticated REST API under `/api/v1/`. Authenticate via session cookie (web login) or Bearer token (API key — generate in Settings → API).

### Vendors
- `GET /api/v1/vendors` — list/search vendors (`?query=`, `?tier=`)
- `GET /api/v1/vendors/{id}` — vendor detail
- `PUT /api/v1/vendors/{id}` — update vendor
- `DELETE /api/v1/vendors/{id}` — delete vendor
- `GET /api/v1/vendors/{id}/score` — score summary
- `GET /api/v1/vendors/{id}/export` — download vendor JSON
- `POST /api/v1/vendors/import` — create vendor from JSON
- `GET /api/v1/vendors/{id}/assessments` — list vendor's assessments
- `GET /api/v1/vendors/{id}/certifications` — list vendor's certifications

### Assessments
- `GET /api/v1/assessments` — list assessments (filters: `?vendorId=`, `?status=`, `?fromDate=`, `?toDate=`, `?format=csv`)
- `GET /api/v1/assessments/{id}` — full assessment detail (questions, responses, findings, comments)

### Findings
- `GET /api/v1/findings` — list findings (filters: `?status=`, `?severity=`, `?vendorId=`)
- `PATCH /api/v1/findings/{id}` — update finding status (`{ "status": "REMEDIATED" | "RISK_ACCEPTED" }`)

### Frameworks
- `GET /api/v1/frameworks` — list compliance frameworks
- `GET /api/v1/frameworks/{id}` — framework detail with controls (`?search=`)

### Dashboard
- `GET /api/v1/dashboard/summary` — portfolio metrics (scores, findings, RAG distribution, top deficient controls)

### Audit
- `GET /api/v1/audit` — query audit log (JSON or CSV, `?page=`, `?action=`, `?userId=`, `?fromDate=`, `?toDate=`)

Files are served through the authenticated `GET /api/attachments/{attachmentId}` route.

Full interactive docs: **http://localhost:3000/docs**

## Configuration

All operational settings are managed in-app via **Settings** (ADMIN role) — no file editing needed after initial setup:
- Organization name, support email, logo, brand colours (Appearance tab)
- SMTP server credentials (encrypted at rest)
- Email templates with `{{tokens}}` (invite, password-protected invite, reminder, escalation, submission)
- Scoring weights and RAG thresholds
- Reminder offsets, escalation timing, assessment defaults, auto-logout (Configuration tab)
- Storage backend selection (Local disk, AWS S3, Azure Blob) with encrypted credentials
- API keys with IP allowlisting and expiry
- SSO providers (Entra ID, Google, OIDC) — see [ssoConfig.md](./ssoConfig.md) for per-provider setup
- Role-based access control with three system roles (Admin, Reviewer, Viewer) plus custom roles with granular permissions

## Running behind a reverse proxy (HTTPS)

The app is designed to run behind a TLS-terminating reverse proxy (Caddy, nginx, Zoraxy,
Azure Application Gateway / Front Door, etc.). Auth.js runs with `trustHost` enabled, so it
derives its public origin and secure-cookie behaviour from the proxy's forwarded headers —
**no `AUTH_URL` is required** as long as the proxy forwards them.

**Your proxy must forward:**

- `Host` / `X-Forwarded-Host` — the public hostname
- `X-Forwarded-Proto` — `https` (so auth issues Secure cookies and correct callback URLs)
- `X-Forwarded-For` — the client IP (used for rate limiting and API-key IP allowlists)

**Required configuration:**

- Set `APP_URL` to your public HTTPS URL (e.g. `https://risk.example.com`). It is used to
  build vendor portal links, email links, the break-glass URL, **and** (by default) the
  Auth.js OAuth/OIDC callback URLs — `AUTH_URL` falls back to `APP_URL` unless set explicitly.
  If SSO callbacks come back pointing at `localhost`, this is the value to fix.
- Set `TRUSTED_PROXY_COUNT` to the number of trusted proxies in front of the app. The client
  IP is read that many hops from the **right** of `X-Forwarded-For`, so a client cannot spoof
  it by sending their own header. One proxy = `1`; a CDN in front of a proxy = `2`.
- **Do not expose the app's port (3000) publicly** — route it only through the proxy. If the
  app is directly reachable, `X-Forwarded-For` can be forged.
- If your proxy/CDN sets a dedicated single client-IP header, set `CLIENT_IP_HEADER`
  (e.g. `cf-connecting-ip`, `x-azure-clientip`) and it will be used instead of
  `X-Forwarded-For`.
- `AUTH_URL` defaults to `APP_URL`; set it explicitly only if auth must use a different
  origin (or as a hard override for proxies that mangle the host/proto headers).

### Proxy examples

**Caddy** (`Caddyfile`) — forwards all `X-Forwarded-*` automatically. Use `TRUSTED_PROXY_COUNT=1`.

```caddy
risk.example.com {
    reverse_proxy app:3000
}
```

**nginx** — set `TRUSTED_PROXY_COUNT=1`.

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

**Zoraxy** — create an HTTP proxy rule to `app:3000`, keep the default "Add X-Forwarded-For"
behaviour, and enable TLS on the incoming endpoint. Use `TRUSTED_PROXY_COUNT=1`.

**Azure (Application Gateway / Front Door)** — these terminate TLS and set `X-Forwarded-For`
and `X-Forwarded-Proto`. Front Door also sets `X-Azure-ClientIP`. For a single Azure hop use
`TRUSTED_PROXY_COUNT=1`; to use the dedicated header set `CLIENT_IP_HEADER=x-azure-clientip`.
If Azure sits in front of another proxy, increase `TRUSTED_PROXY_COUNT` accordingly.

## Data & storage

The app keeps state in **two** places, and both must be backed up together:

- **PostgreSQL (`db` container / `db_data` volume)** — all relational data *and settings*:
  vendors, assessments, users, roles, audit logs, and every operational setting (organisation
  name, brand colours, SMTP, scoring, the logo *reference*, etc. — stored in the `AppSetting`
  table).
- **App container disk (`evidence_data` volume, mounted at `/app/.storage`)** — the actual
  uploaded **file bytes**: vendor evidence files, certification attachments, vendor attachments,
  and the org logo image. Configured via `EVIDENCE_STORAGE_PATH`. Files are served only through
  an authenticated route, never a public URL.

Files are managed through a generic **Attachment** model (`entityType` + `entityId`) — not just
evidence, but also certification files and general vendor attachments. All storage sits behind a
swappable `FileStorage` interface. The default implementation is **local disk**, but **AWS S3**
and **Azure Blob** backends are available as opt-in alternatives configurable in Settings →
Storage. Cloud SDKs (`@aws-sdk/client-s3`, `@azure/storage-blob`) are regular dependencies
installed automatically. Credentials are encrypted at rest with `APP_ENCRYPTION_KEY`.

For detailed cloud setup instructions (IAM policies, SAS tokens, migration), see
[`docs/STORAGE.md`](docs/STORAGE.md).

> The database stores *metadata and references* (e.g. `logoKey`, evidence filename → assessment
> link); the volume (or cloud bucket) stores the *files themselves*. A database-only backup will
> leave uploaded files orphaned, and a files-only backup will lose the links — always capture both.

## Backup

Back up the **database**:

```bash
# Bash
./scripts/backup.sh

# PowerShell
.\scripts\backup.ps1
```

Also back up the **evidence/logo files** on the app volume, e.g.:

```bash
docker run --rm -v mitch-risk_evidence_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/evidence-$(date +%F).tar.gz -C /data .
```

> **Do not** run `docker compose down -v` unless you intend to wipe data — the `-v` flag
> deletes both the Postgres (`db_data`) and evidence (`evidence_data`) volumes.

## Testing

Unit tests run anywhere. **Integration tests hit a real PostgreSQL database and delete/reset
data** (settings, notification logs, fixtures), so they must run against a **dedicated test
database**, never your dev/prod one.

1. Create a test database (same server is fine), e.g. `mitch_risk_test`:
   ```bash
   # using the compose Postgres container
   docker compose exec db createdb -U mitch mitch_risk_test
   ```
2. Point the suite at it via `TEST_DATABASE_URL` (in `.env` or `.env.test`):
   ```
   TEST_DATABASE_URL="postgresql://mitch:mitch@localhost:5432/mitch_risk_test?schema=public"
   ```
3. Apply migrations to the test database once (and after new migrations):
   ```bash
   # bash
   DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
   ```
   ```powershell
   # PowerShell
   $env:DATABASE_URL=$env:TEST_DATABASE_URL; npx prisma migrate deploy
   ```
4. Run the tests:
   ```bash
   npm run test        # unit + integration (Vitest)
   npm run test:e2e    # Playwright
   ```

The runner **refuses to start** unless the target database name contains `test` (or you set
`ALLOW_TESTS_ON_THIS_DB=1` to intentionally run against it — which *will* mutate that database).

## Cron

Schedule a system cron to hit the secured endpoint:

```bash
curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/run
```

This triggers: vendor reminders, overdue escalations, recurring assessment creation, certification/contract expiry notices, audit log pruning, email log pruning, and orphaned file sweep.

## Documentation

- [Architecture Solution Design](docs/ARCHITECTURE.md) — full platform architecture with diagrams
- [Security Overview](docs/APPSECURITY.md) — security architecture and hardening
- [Cloud Storage Setup](docs/STORAGE.md) — AWS S3 and Azure Blob configuration
- [SSO Configuration](docs/ssoConfig.md) — Entra ID, Google, and generic OIDC setup
