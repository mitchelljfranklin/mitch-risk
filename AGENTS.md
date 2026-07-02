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
- **Local-disk volume** — evidence file storage behind a storage interface (save/read/delete/list; S3/MinIO swappable later); files served only via an authenticated route
- **System cron -> secured `/api/cron/run`** — reminders, escalations, recurring assessments, audit-log & email-log pruning, orphaned-file sweep
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
                     #   skeleton, tabs, textarea, tooltip, alert-dialog
  toast.tsx          # toast notification system (success/error/info)
  stat-card.tsx      # animated count-up stat cards
  empty-state.tsx    # SVG illustration empty states
  calendar-heatmap.tsx # GitHub-style activity grid
  keyboard-shortcuts.tsx # ? key modal with g+letter navigation
  confirm-dialog.tsx # reusable confirmation modal for destructive actions
  idle-timer.tsx     # inactivity detection with countdown + auto-sign-out
lib/                 # cross-cutting logic
  actions/           # server actions (assessments, collaboration, portal, templates, users, vendors)
  db/                # typed data-access layer (assessments, audit, collaboration,
                     #   compliance, frameworks, notifications, roles, scoring, templates, users, vendors)
  email/             # Nodemailer mailer + token replacer
  schemas/           # shared zod schemas + inferred types
  settings/          # DB-backed operational config (schema, accessor, read/write)
  api-keys.ts        # API key generation, bcrypt hashing, CIDR IP matching
  api-auth.ts        # unified authenticateRequest() — session + Bearer token + permission check
  auth.ts            # Auth.js config + permission guards (requirePermission/hasPermission)
  permissions.ts     # RBAC permission catalog, default system roles, permission helpers
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
  storage/           # file storage interface (save/read/delete/list) + local-disk implementation
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
- **Tested.** Every new function or feature ships with tests, and any change to an existing
  function or feature updates the affected tests in the same change. Core logic (especially
  scoring) has unit tests; relevant tests pass.
- **Access-controlled.** Every new feature is wired into RBAC: its permission key(s) are
  defined in `lib/permissions.ts`, mapped into the default system roles, and enforced on every
  server action/route/page (`requirePermission`). Every control that triggers a gated action is
  **hidden** (not greyed-out) when the user lacks the permission — a role without access gets a
  clean read-only screen, never a button that redirects on click. No feature ships gated only
  by "is authenticated". See "Role-based access control" below.
- **Migrations clean.** Prisma migrations apply on a fresh database; seeds are idempotent.
- **Verified.** The phase's manual verification steps were actually executed and the results
  recorded in the gate.

## Reusability & DRY (build once, reuse everywhere)

- **Styling = tokens only.** Use design-token-backed Tailwind classes; never hardcode hex
  colours, spacing, radius, or font sizes. New visual variants extend shadcn primitives via
  `cva` + `cn` — do not fork or copy a primitive.
- **Status colours are semantic.** UI status/chrome uses semantic tokens (`--success`,
  `--destructive`); do not reuse the user-configurable RAG palette (`--rag-*`) for UI chrome —
  RAG tokens are for score/compliance indicators only.
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

## Role-based access control (build access-control in, every time)

Authorization is permission-based, not "is authenticated". Roles are DB-backed
(`Role` model) and carry a set of `resource:action` permission keys. Three system roles ship
by default — **Admin** (all permissions, locked), **Reviewer** (write + review), and
**Viewer** (read-only) — and admins can create custom roles with any subset of permissions.
The permission catalog, default role mappings, and helpers live in `lib/permissions.ts`; the
guards (`requirePermission`, `hasPermission`) live in `lib/auth.ts`. See `authstage.md` for
the design of record.

Every feature — new or changed — must be wired into RBAC in the same change. This is not a
one-off; it is the normal workflow:

1. **Define permissions.** Add the feature's `resource:action` key(s) to the catalog in
   `lib/permissions.ts`. Reuse an existing key if one already fits; do not invent parallel
   keys for the same concern.
2. **Map to default roles.** Add the new key(s) to the appropriate `SYSTEM_ROLE_DEFAULTS`
   (Admin always gets all; grant Reviewer/Viewer only what their intent allows — Viewer gets
   `*:view` only). Reflect the change in the seed so fresh and existing databases converge.
3. **Enforce on the server.** Guard every server action, route handler, and page with
   `requirePermission("<key>")`. Reads may use the relevant `:view` permission; writes must use
   the specific write/manage permission. Never ship a feature gated only by `requireUser()`.
4. **Gate the UI — hide, don't dangle.** Every control that triggers a gated action (buttons,
   links, forms, and the client widgets that render them) must be hidden when the current user
   lacks the permission. Never render a write control that only redirects on click — that is a
   broken UX. Rules:
   - **Hide, not grey-out.** A role without a permission simply does not see the control; a
     Viewer gets a clean read-only screen. (No disabled/greyed buttons unless a specific need
     is agreed.)
   - **Keep reads visible.** View-only affordances (Export CSV, Download PDF, read-only
     displays of comments/reviews/version notes) stay; only the write/manage controls are
     hidden.
   - **Gate on the server.** Pages are Server Components: capture the user from the guard
     (`const user = await requirePermission("<view-key>")`) and wrap each control in
     `{hasPermission(user.permissions, PERMISSIONS.X) && ( ... )}` using the pure helper from
     `lib/permissions.ts`. Prefer wrapping the child **client** widget at its render site in the
     server parent so client components stay permission-agnostic.
   - **Nav + tabs.** Hide sidebar items and settings tabs the user can't use, and sanitize any
     `?tab=`/route param against the user's allowed set so hidden content can't be forced.
   - **Empty containers.** When hiding a control empties a toolbar/row/card, hide the container
     too, and adjust empty-state copy so it doesn't invite an action the user can't take.

   UI hiding is cosmetic — the server guard from step 3 is the real control, so **both** are
   always required.
5. **Test it.** Add/adjust tests proving the permission is enforced (allowed vs. denied) and
   that default roles include the expected keys, per the Definition of Done. Where practical,
   add/extend a Playwright e2e asserting a lower-privilege role (e.g. Viewer) does **not** see
   the gated controls (see `e2e/rbac-viewer.spec.ts`).

When editing an existing feature, update its permission wiring in the same change (new
sub-actions get their own key or reuse the feature's key; removed features drop unused keys
from the catalog and role defaults).

## Conventions

- TypeScript `strict`; validate all external input with **zod** (shared client/server schemas).
- Do not add code comments unless explicitly requested.
- **Runtime configuration**: operational/end-user settings (branding, email/SMTP, reminder
  cadence, escalation recipients, scoring weights & thresholds, file limits, users, roles) are managed
  in-app via DB-backed Settings (requires the relevant manage permission) — never by editing files once the product is
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
- **Data lifecycle.** Deleting a record must also remove its associated storage files
  (evidence, logos); a replaced upload deletes the old file. The cron orphaned-file sweep is
  the backstop, not the primary cleanup. Deleting a user preserves audit and review history via
  nullable `SetNull` relations (surfaced as "Deleted user") — never cascade-delete audit trails.
- Prefer Server Components for reads and Server Actions for writes.
- **Keep the OpenAPI spec current.** Whenever a new API endpoint is added, modified, or
  removed, update `lib/openapi.json` in the same phase. The spec lives at `/api/docs` and
  powers the Swagger UI at `/docs`. Every endpoint must have a summary, description, full
  parameter schemas, response schemas, and error codes. This ensures citizen developers and
  SIEM integrations always have accurate API documentation.
