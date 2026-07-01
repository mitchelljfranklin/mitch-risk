# AGENTS.md

Operating guide for any agent or developer working in this repository.

## Project

**mitch-risk** — a lightweight vendor risk management platform for a small business.
It lets internal staff build questionnaires, send them to vendors via a no-login secure
link, auto-score the responses, map answers to ISO 27001 / SOC 2 / NIST CSF / Essential Eight
controls, surface gaps as findings, and track each vendor's risk profile over time. Supports
API key authentication with Bearer tokens, IP allowlisting, and configurable expiry. REST API
documented via Swagger/OpenAPI at `/docs`.

Design principle: **simple and easy to manage**. Prefer fewer, well-connected screens
over sprawling configuration. Do not add features that are not in the plan without asking.

## Stack

- **Next.js (App Router) + TypeScript** — full-stack (Server Components + Server Actions / Route Handlers)
- **PostgreSQL + Prisma** — relational data + typed ORM + migrations
- **Tailwind CSS v4 + shadcn/ui** — UI; themed via CSS-variable design tokens (light + dark)
- **Auth.js (NextAuth v5)** — internal staff auth; vendor portal uses an opaque, expiring, revocable token (no login)
- **Nodemailer over SMTP** — provider-agnostic email (SendGrid initially via SMTP relay); **React Email** templates
- **recharts** — dashboard charts: donut, bar (Phase 28)
- **@react-pdf/renderer** — PDF assessment reports (Phase 19)
- **Swagger UI (CDN)** — interactive API documentation at `/docs` (Phase 29)
- **bcryptjs** — user password hashing and API key hashing
- **Local-disk volume** — evidence file storage behind a storage interface (S3/MinIO swappable later); files served only via an authenticated route
- **System cron -> secured `/api/cron/run`** — reminders, escalations, recurring assessments, audit log pruning
- **Docker Compose** (app + Postgres), reverse proxy (Caddy/nginx) for TLS — self-hosted

## Repository layout (created during Phase 0)

```
app/                 # Next.js App Router
  (internal)/        # authenticated dashboard
    settings/         #   email-tracking, api-form, audit-form, etc.
  (auth)/            # login, first-run setup
  portal/[token]/    # public vendor questionnaire (no login)
  api/               # cron, file serving, auth, REST API v1, Swagger docs
  docs/              # Swagger UI page
  style-guide/       # component showcase
components/          # shadcn ui primitives + domain composites
  ui/                # badge, button, card, chart, checkbox, dropdown-menu, input,
                     #   label, radio-group, select, separator, sheet, sidebar,
                     #   skeleton, tabs, textarea, tooltip
  toast.tsx          # toast notification system (success/error/info)
  stat-card.tsx      # animated count-up stat cards
  empty-state.tsx    # SVG illustration empty states
  calendar-heatmap.tsx # GitHub-style activity grid
  keyboard-shortcuts.tsx # ? key modal with g+letter navigation
  toast.tsx          # toast notification system (success/error/info)
lib/                 # cross-cutting logic
  actions/           # server actions (assessments, collaboration, portal, templates, users, vendors)
  db/                # typed data-access layer (assessments, audit, collaboration,
                     #   compliance, frameworks, notifications, scoring, templates, users, vendors)
  email/             # Nodemailer mailer + token replacer
  schemas/           # shared zod schemas + inferred types
  settings/          # DB-backed operational config (schema, accessor, read/write)
  api-keys.ts        # API key generation, bcrypt hashing, CIDR IP matching
  api-auth.ts        # unified authenticateRequest() — session + Bearer token
  auth.ts            # Auth.js config + role guards
  crypto.ts          # AES-256-GCM encryption for secret settings
  env.ts             # zod-validated deployment env
  json.ts            # deep-clone helper for JSON-safe values
  openapi.json       # OpenAPI 3.0 spec powering Swagger UI at /docs
  pdf-report.tsx     # @react-pdf/renderer assessment report generator
  portal.ts          # portal state machine (visibility, required questions)
  prisma.ts          # shared Prisma client instance
  rate-limit.ts      # in-memory sliding-window rate limiter
  scoring.ts         # weighted scoring engine + compliance checker
  theme-tokens.tsx   # server-rendered CSS variable injection (brand colours)
  tokens.ts          # opaque portal token generation + expiry
  utils.ts           # cn(), formatDate(), formatPercent()
  storage/           # file storage interface + local-disk implementation
hooks/              # React hooks (use-form-toast, use-mobile)
emails/              # React Email templates (invite, reminder, escalation, dynamic)
prisma/              # schema.prisma, migrations, seed.ts
  seed-data/         # ISO 27001, SOC 2, NIST CSF, Essential Eight seed data + types
scripts/             # backup.sh, backup.ps1
e2e/                 # Playwright end-to-end tests
docs/                # PLAN.md, STAGE-GATES.md
```

## Commands

These npm scripts are defined in `package.json` (created in Phase 0). Run the relevant
ones before declaring any phase complete.

- `npm run dev` — local dev server
- `npm run build` — production build (must pass before any gate sign-off)
- `npm run lint` — ESLint (must be clean before any gate sign-off)
- `npm run typecheck` — `tsc --noEmit` (must be clean before any gate sign-off)
- `npm run format:check` — Prettier check (clean before any gate sign-off); `npm run format` to fix
- `npm run test` — unit tests (Vitest)
- `npm run test:e2e` — end-to-end tests (Playwright)
- `npm run db:migrate` — apply Prisma migrations
- `npm run db:seed` — run seed script
- `docker compose up` — app + Postgres for local/self-host

> If a command above does not yet exist for the phase you are in, create it as part of
> that phase rather than skipping verification.

## Working agreement — stage gates

This project is delivered in **gated phases**. The authoritative plan is
[`docs/PLAN.md`](docs/PLAN.md); the gate checklists and sign-off log are in
[`docs/STAGE-GATES.md`](docs/STAGE-GATES.md).

Rules:

1. Work one phase at a time, in order. Do not start a phase until the previous phase is
   **Approved** in the sign-off log.
2. When a phase's work is done, run the verification commands, fill in its gate checklist
   with evidence, and set the phase to **Ready for review**. Then stop and ask for sign-off.
3. Keep `docs/PLAN.md`, `docs/STAGE-GATES.md`, and this file accurate as reality changes.

## Definition of Done — no placeholders

Every delivered item, in every phase, must meet this bar:

- **Wired end-to-end.** UI <-> Server Action/Route Handler <-> Prisma <-> Postgres, using
  real persisted data. No hardcoded/mock arrays standing in for the database.
- **No stubs in delivered scope.** No `TODO`/`FIXME`, no empty/throwing function bodies, no
  dead or commented-out code, no "lorem ipsum" or fake screens. Intentional empty states are
  allowed but must be clearly labelled as empty states (not placeholders).
- **Quality gates pass.** `npm run lint`, `npm run typecheck`, and `npm run build` are clean.
- **Tested.** Core logic (especially scoring) has unit tests; relevant tests pass.
- **Migrations clean.** Prisma migrations apply on a fresh database; seeds are idempotent.
- **Verified.** The phase's manual verification steps were actually executed and the results
  recorded in the gate.

## Reusability & DRY (build once, reuse everywhere)

- **Styling = tokens only.** Use design-token-backed Tailwind classes; never hardcode hex
  colours, spacing, radius, or font sizes. New visual variants extend shadcn primitives via
  `cva` + `cn` — do not fork or copy a primitive.
- **One home per concern.** UI primitives in `components/ui/`; reusable composites in
  `components/`; all cross-cutting logic in `lib/` (prisma, scoring, auth, email, storage,
  tokens, env, utils); shared zod schemas + inferred types in `lib/schemas/`.
- **No copy-paste.** If markup or logic appears twice, extract a component or function. If a
  Prisma query is reused, put it in the data-access layer (`lib/db/`).
- **Reuse before create.** Before adding a token, component, helper, or schema, search for an
  existing one and reuse/extend it. If a thing is needed in two or more places, extract it.
- See `docs/PLAN.md` section 9 for the reusable-asset map.

## Code readability & best practices

Code is read far more often than it is written. Optimise for the next human who has to manage it.

- **Full, descriptive names — no cryptic shorthand.** `assessment`, not `asmt`;
  `calculateWeightedScore`, not `calcWS`. Only widely understood abbreviations are allowed
  (`id`, `URL`, `API`, `HTTP`, `UI`). Booleans read as predicates (`isExpired`, `hasEvidence`).
  Functions are verb phrases; React components are PascalCase nouns; true constants are
  `UPPER_SNAKE_CASE`. **Never use single-letter variables outside of trivial loop indices**
  (`i`, `j`) or mathematical algorithm steps where the single-letter name is the standard
  convention (e.g., `r`, `g`, `b` in color math). Examples of violations: `const u = await
  getCurrentUser()` should be `const user = await getCurrentUser()`; `const cMap = new
  Map(...)` should be `const controlMap = new Map(...)`; `const c = controlMap.get(id)`
  should be `const control = controlMap.get(id)`.
- **Small, single-responsibility units.** Short functions/components that do one thing. Prefer
  guard clauses and early returns over deep nesting; no dense one-liners or stacked ternaries.
- **No magic values.** Replace literal numbers/strings with named constants or enums
  (e.g. risk-weight values, status strings).
- **Explicit types at boundaries.** Type exported functions, props, and return values; never use
  `any` (use `unknown` + narrowing). Validate all external input with zod.
- **Readability without comments.** Clarity comes from names and structure, not comments. Per
  project convention, do not add comments unless explicitly requested; when one is requested,
  explain *why*, not *what*.
- **Follow the ecosystem's best practices.** Next.js App Router idioms (Server Components for
  reads, Server Actions for writes), accessible semantic markup, meaningful error handling
  (no silent catches), and the security rules below. When unsure, follow the framework's
  documented convention rather than inventing one.
- **Automated consistency.** Prettier handles formatting and ESLint handles linting; both run
  clean before any gate sign-off (`npm run lint`, `npm run format:check`).

## Conventions

- TypeScript `strict`; validate all external input with **zod** (shared client/server schemas).
- Do not add code comments unless explicitly requested.
- **Runtime configuration**: operational/end-user settings (branding, email/SMTP, reminder
  cadence, escalation recipients, scoring weights & thresholds, file limits, users) are managed
  in-app via DB-backed Settings (ADMIN role) — never by editing files once the product is
  running. Only deployment bootstrap/infra belongs in env (`DATABASE_URL`, `AUTH_SECRET`,
  `APP_ENCRYPTION_KEY`, `CRON_SECRET`, `APP_URL`, storage path). This split is for end-user
  operation, not product build/dev config (tsconfig, ESLint, etc.).
- Keep deployment secrets in environment variables; secrets stored in Settings (e.g. the SMTP
  password) are encrypted at rest with `APP_ENCRYPTION_KEY` and never returned to the client.
- **No single-letter variables.** Except for loop indices (`i`, `j`) and standard
  mathematical notation in algorithm functions, every variable must have a descriptive
  name. Review all `const` declarations before committing.
- Never commit secrets or evidence files.
- Never expose evidence files via public URLs — only through the authenticated route.
- Prefer Server Components for reads and Server Actions for writes.
- **Keep the OpenAPI spec current.** Whenever a new API endpoint is added, modified, or
  removed, update `lib/openapi.json` in the same phase. The spec lives at `/api/docs` and
  powers the Swagger UI at `/docs`. Every endpoint must have a summary, description, full
  parameter schemas, response schemas, and error codes. This ensures citizen developers and
  SIEM integrations always have accurate API documentation.
