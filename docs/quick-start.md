# Quick Start

Get Mitch‑Risk running in minutes with Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose installed
- [Node.js](https://nodejs.org/) >= 22 (for local development only)
- [Git](https://git-scm.com/) (to clone the repository)

## Docker Compose Quickstart

### Pre-built image (recommended)

No build tools required — just Docker. Use the pre-built image from
[GitHub Container Registry](https://github.com/mitchelljfranklin/mitch-risk/pkgs/container/mitch-risk):

```bash
curl -O https://raw.githubusercontent.com/mitchelljfranklin/mitch-risk/master/docker-compose.pull.yml
```

Create a `.env` file with your secrets:

```env
POSTGRES_PASSWORD=<a strong password>
AUTH_SECRET=<generate a strong random string>
APP_ENCRYPTION_KEY=<at least 32 random characters>
CRON_SECRET=<another strong random string>
APP_URL=http://localhost:3000
```

```bash
docker compose -f docker-compose.pull.yml up -d
```

> **Portainer users:** A ready-to-customize template is available at
> [`docker-compose.portainer.yml`](https://github.com/mitchelljfranklin/mitch-risk/blob/master/docker-compose.portainer.yml).
> Paste it into Portainer's stack editor and replace the `CHANGE_ME` placeholders.

### Build from source

```bash
git clone https://github.com/mitchelljfranklin/mitch-risk.git
cd mitch-risk
cp .env.example .env
```

Edit `.env` and set your own secrets:

```env
DATABASE_URL=postgresql://mitch:mitch@db:5432/mitch_risk?schema=public
AUTH_SECRET=<generate a strong random string>
APP_ENCRYPTION_KEY=<at least 32 random characters>
CRON_SECRET=<another strong random string>
APP_URL=http://localhost:3000
```

Start the stack:

```bash
docker compose up -d
```

## First Login

1. Open `http://localhost:3000/setup` in your browser.
2. Create your first admin account (email + password, minimum 12 characters).
3. The `/setup` page is only available when no users exist — after setup, it returns 404.

## Next Steps

After logging in, configure the platform:

1. **Configure email** — go to Settings → Email, enter your SMTP server details.
2. **Create a template** — go to Templates, build a questionnaire with sections and questions.
3. **Add a vendor** — go to Vendors, create a vendor profile with contact info.
4. **Send an assessment** — create an assessment for the vendor from your template and send it.
5. **Review responses** — when the vendor submits, review their answers and generate findings.

## Local Development

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

### Useful Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run format:check` | Prettier format check |
| `npm run precheck` | Run typecheck + lint + format:check (same as CI) |
| `npm run test` | Run unit + integration tests |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed the database |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | — | Auth.js JWT signing secret (min 32 chars, used for session tokens) |
| `APP_ENCRYPTION_KEY` | Yes | — | Key for AES-256-GCM encryption of secrets at rest (min 32 chars) |
| `CRON_SECRET` | Yes (prod) | — | Secret passed in `X-Cron-Secret` header to trigger cron jobs |
| `APP_URL` | No | `http://localhost:3000` | Public URL used for portal links and auth callbacks |
| `EVIDENCE_STORAGE_PATH` | No | `./.storage/evidence/` | Directory for local file storage |
| `TRUSTED_PROXY_COUNT` | No | `0` | Number of trusted reverse proxy hops for client IP resolution |
| `CLIENT_IP_HEADER` | No | — | Optional dedicated header for client IP (e.g. `cf-connecting-ip`) |
| `AUTH_URL` | No | Falls back to `APP_URL` | Override for auth callbacks if different from `APP_URL` |

> **Important:** `CRON_SECRET` must be set in production. The app refuses to boot without it (except during `next build`). `TRUSTED_PROXY_COUNT` must match your actual proxy hop count — see [Reverse Proxy](./deployment/reverse-proxy) for details.
