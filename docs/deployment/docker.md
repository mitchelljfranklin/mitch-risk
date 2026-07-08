# Docker Deployment

Deploy Mitch‑Risk with Docker Compose for a self-hosted, single-container setup.

## Quick Deploy

```bash
git clone https://github.com/mitchelljfranklin/mitch-risk.git
cd Mitch‑Risk
cp .env.example .env
```

Edit `.env` with your secrets, then:

```bash
docker compose up -d
```

The stack includes two containers:
- **app** — Next.js application server (port 3000)
- **db** — PostgreSQL database (internal network, port 5432)

## Secrets to Change

> **Change these before exposing to any network.** The defaults are for local development only.

| Secret | Location | Purpose |
|--------|----------|---------|
| `AUTH_SECRET` | `.env` | JWT signing key for sessions |
| `APP_ENCRYPTION_KEY` | `.env` | AES-256-GCM key for encrypting secrets at rest |
| `CRON_SECRET` | `.env` | Secret for triggering cron jobs |
| `POSTGRES_PASSWORD` | `.env` / `docker-compose.yml` | Database password |

### Generate Strong Secrets

```bash
# On Linux/macOS
openssl rand -hex 32    # For AUTH_SECRET, APP_ENCRYPTION_KEY, CRON_SECRET
```

```powershell
# On Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
```

## First-Run Setup

1. After `docker compose up -d`, open `http://localhost:3000/setup`.
2. Create your first admin account.
3. The `/setup` page is only available when zero users exist.

> The production container requires `CRON_SECRET` to boot. Set it in `.env` before starting.

## Volumes

| Volume | Purpose | Backup? |
|--------|---------|:------:|
| `db_data` | PostgreSQL data directory | Yes |
| `evidence_data` | Uploaded files (evidence, logos, attachments) | Yes |

> **Do not run `docker compose down -v`** unless you intend to wipe all data. The `-v` flag deletes both volumes.

## Environment Variables in Compose

The expected `.env` file for Docker Compose:

```env
DATABASE_URL=postgresql://mitch:mitch@db:5432/mitch_risk?schema=public
AUTH_SECRET=<your-secret>
APP_ENCRYPTION_KEY=<your-key-min-32-chars>
CRON_SECRET=<your-secret>
APP_URL=https://risk.example.com
EVIDENCE_STORAGE_PATH=/app/.storage/evidence
TRUSTED_PROXY_COUNT=1
```

## Upgrading

```bash
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
```

Migrations run automatically on container start (`prisma migrate deploy`).

## Multi-Container Considerations

The in-memory rate limiter is per-process — correct for single-container deployment. If you scale the app horizontally:
- Add a shared Redis instance for rate limiting
- Set `TRUSTED_PROXY_COUNT` correctly for all proxy hops
- Cron jobs should only run from one instance

## Scheduled Tasks (Cron)

Schedule a system cron to hit the secured endpoint:

```bash
# Every 5 minutes
*/5 * * * * curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/run
```

This triggers: vendor reminders, overdue escalations, recurring assessment creation, certification/contract expiry notices, audit log pruning, email log pruning, and orphaned file sweep.
