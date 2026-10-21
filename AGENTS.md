# AGENTS.md

Operating guide for agents and developers working in this repository.

## Project

**Mitch‑Risk** — a white-label, self-hosted third party vendor risk management tool. Internal
staff build questionnaires, send them to vendors via a no-login secure link, auto-score the
responses, map answers to ISO 27001 / SOC 2 / NIST CSF / Essential Eight controls, surface gaps
as findings, and track each vendor's risk over time. REST API is documented via Swagger/OpenAPI
at `/docs`.

Design principle: **simple and easy to manage.** Prefer fewer, well-connected screens over
sprawling configuration. Do not add features that are not in the plan without asking.

## Stack

- **Next.js 16 (App Router) + TypeScript** — full-stack: Server Components for reads, Server
  Actions / Route Handlers for writes.
- **PostgreSQL + Prisma 7** — migrations live in `prisma/migrations`; generated client is
  imported from `prisma/generated/prisma/client`.
- **Tailwind CSS v4 + shadcn/ui** — themed via CSS-variable design tokens (light + dark).
- **Auth.js (NextAuth v5)** for staff login; the vendor portal uses an opaque, expiring,
  revocable token (no login).
- **Nodemailer over SMTP** + React Email templates.
- **recharts** (dashboard charts), **@react-pdf/renderer** (PDF reports), **bcryptjs** (user +
  API-key hashing), **zod** (all external input).
- **Pluggable file storage** — local disk / S3 / Azure Blob behind `lib/storage/`. Files are
  served only through authenticated routes.
- **Built-in scheduler** (`lib/scheduler.ts`, started from `instrumentation.ts`, 5-minute tick):
  reminders, escalations, recurring assessments, audit/email-log pruning, orphaned-file sweep.
  Toggle in Admin → Scheduling; optional external trigger at secured `/api/cron/run`.
- **Docker Compose** (app + Postgres), reverse proxy for TLS — self-hosted.

## Repository layout — where things belong

```
app/                 Next.js App Router
  (internal)/          authenticated dashboard (admin/, settings/, trust-center/,
                       risk-register/, vendors/import/, templates/import/, frameworks/import/)
  (auth)/              login, first-run setup
  portal/[token]/      public vendor questionnaire (no login)
  trust/               public, published-only trust center
  api/                 cron, authenticated file serving (attachments/), public trust files,
                       REST v1 (v1/), Swagger docs
  docs/  style-guide/  Swagger UI page, component showcase
components/          reusable composites; components/ui/ = shadcn primitives only
  trust-center/        badges/documents/subprocessors/sections managers
  auth/                SSO buttons
lib/                 cross-cutting logic
  actions/             Server Actions (assessments, collaboration, portal, templates, users,
                       vendors, findings, frameworks, certifications, trust-center, roles, auth,
                       customer-responsibility, profile)
  db/                  typed data-access layer — all Prisma queries live here
    roles.ts             role CRUD + convergeSystemRolePermissions()
    audit.ts             logAudit() + AUDIT_ACTIONS (single source of truth for event types)
  cron/                scheduler job bodies + orphan sweep referenced-key set
  schemas/             shared zod schemas + inferred types
  settings/            DB-backed operational config (schema, accessor, read/write)
  storage/             storage interface + local-disk/s3/azure + orphan-sweep
  email/               Nodemailer mailer + token replacer
  i18n/                cookie-based locale config, resolver, and request config
  permissions.ts       PERMISSIONS catalog, SYSTEM_ROLE_DEFINITIONS/NAMES, hasPermission()
  auth.ts              Auth.js config + requirePermission()
  prisma.ts            shared Prisma client instance
hooks/               use-form-toast, use-action-feedback, use-locale-switch, use-mobile
emails/              React Email templates rendered from Settings via token replacement
messages/            en/es translation catalogs (key parity enforced by a unit test)
prisma/              schema.prisma, migrations, seed.ts, seed-demo.ts, seed-data/
scripts/             backup, bump-version.mjs, prepare-standalone.mjs
e2e/                 Playwright end-to-end tests
docs/                VitePress user docs (GitHub Pages, auto-deploys on push to master)
proxy.ts             Next 16 proxy: CSP nonce + security headers
instrumentation.ts   boot: converge system role permissions, then start scheduler
```

Key boundaries to respect: **UI primitives in `components/ui/`; composites in `components/`;
cross-cutting logic in `lib/`; every Prisma query in `lib/db/`; zod schemas in `lib/schemas/`.**
Before adding a token, component, helper, or schema, search for an existing one and reuse or
extend it.

## Commands

- `npm run dev` — dev server.
- `npm run build` — production build; also runs `scripts/prepare-standalone.mjs`, which copies
  `.next/static` and `public/` into `.next/standalone` (without it the standalone server boots a
  shell whose JS 404s, so pages render but never hydrate).
- `npm run start` — runs the standalone production server (`.next/standalone/server.js`).
- `npm run precheck` — `typecheck && lint && format:check` (the CI quality gate; run this before
  handing work back).
- `npm run lint` / `npm run typecheck` / `npm run format:check`; `npm run format` to auto-fix
  Prettier (Prettier ignores `*.md` and `docs/`).
- `npm run test` — Vitest unit + integration (`lib/**`, `app/**`, `scripts/**`). Needs a test DB
  — see the test-database rules below.
- `npm run test:e2e` — Playwright; exercises the **production** build (see gotchas).
- `npm run db:migrate` (`prisma migrate dev`) / `npm run db:deploy` (`prisma migrate deploy`) /
  `npm run db:seed` / `npm run db:generate` / `npm run db:studio`.
- `npm run docs:dev` / `docs:build` / `docs:preview` — VitePress docs site.
- `npm run bump -- X.Y.Z` — bump the release version across all 8 spots (package.json,
  package-lock.json ×2, Dockerfile, `lib/build-info.ts`, ARCHITECTURE.md, APPSECURITY.md,
  `docs/advanced/sbom.md`). **Never hand-edit those files** — a PowerShell `-Encoding utf8` bump
  once wrote a BOM into package.json and broke CI's JSON parse. The script aborts without writing
  if any expected old version is missing.

## Verification gotchas

- **e2e runs against the production build.** Playwright's `webServer` runs
  `node .next/standalone/server.js` (production mode, so **`CRON_SECRET` is required** — injected
  via `webServer.env`). The config **refuses to run** unless `DATABASE_URL` points at a `*test*`
  database (specs and server share it), and **`reuseExistingServer` is off**: a dev server on
  :3000 makes server-side writes land in dev while specs hit the test DB (silent split-brain).
  Kill anything on :3000 before running e2e locally. `EVIDENCE_STORAGE_PATH` is pinned absolute
  because the standalone server chdirs to `.next/standalone`.
- **Test-database safety (both suites).** Vitest and Playwright refuse to run unless the target
  DB name contains `test` (override only via `ALLOW_TESTS_ON_THIS_DB=1`, which prints a loud
  warning). `npm run test` swaps `DATABASE_URL` for `TEST_DATABASE_URL` when set; Playwright reads
  the ambient `DATABASE_URL`. Standard setup: create `mitch_risk_test`, then
  `DATABASE_URL="…/mitch_risk_test?schema=public" npx prisma migrate deploy`. **Never point a run
  at dev/prod** — suites reset whole tables (settings, notification logs) and mutate rows in
  place; a past run erased live SMTP/branding/scoring settings. Any new integration test that
  writes a shared table (e.g. `app_settings`) must snapshot and restore it, following
  `app/(internal)/admin/save-settings.integration.test.ts`.
- **Apply new Prisma migrations to both the dev DB and the test DB** (`prisma migrate deploy`
  against each) before `npm run test`, or integration tests fail on missing columns.
- **New permission keys converge at boot, not just at seed time.** Editing `PERMISSIONS` /
  `SYSTEM_ROLE_DEFINITIONS` does nothing to an already-seeded database: the Docker seed is gated
  by the `/app/.storage/.seeded` sentinel, so upgrades keep the old Admin array and hide new
  features. `convergeSystemRolePermissions()` (`lib/db/roles.ts`, wired into
  `instrumentation.ts`) heals this on every boot, additively: Admin is reset to the full catalog
  (it is locked by design), Reviewer/Viewer gain only keys new to the database, custom roles are
  never touched. Deliberate trims of Reviewer/Viewer keys therefore survive restarts — **do not**
  replace this with a wholesale `ensureSystemRoles()` re-run, which would stomp them every boot.
  (This bit a real customer upgrading to v1.4.0: Trust Center stayed invisible to admins.)
- **Do not add `loading.tsx` to public routes that call `notFound()`.** The Suspense boundary
  flushes a 200 loading shell before the render throws, so `notFound()` can no longer produce a
  404. Status-sensitive public pages must render without a streaming boundary.
- **Playwright + Radix Select.** `selectOption()` mutates the hidden native `<select>` without
  updating React state, so the app never sees the change. Drive the visible trigger: click the
  combobox, `waitFor` the listbox, click `getByRole("option", …)`.
- **CI runs `prisma generate` → typecheck → lint → format:check → build** on every push. A
  separate e2e job migrates + seeds a `mitch_risk_test` service, builds, and runs Playwright with
  one worker. Prettier failures are the most common CI rejection.

## Client/Server state patterns

- **Server Actions that feed `useActionState` must NOT call `revalidatePath`.** On Node >= 23 the
  revalidation aborts the action's response streaming ("ResponseAborted" in server logs): the
  button sticks pending and the write looks lost. Let the client refresh via the
  `useActionFeedback` hook (toast + `router.refresh()`). When an action is also called outside
  `useActionState` (API routes, cron), `revalidatePath` there is fine. The consumer must actually
  call the hook — a component that discards the state (`const [, action] = useActionState(...)`)
  has no refresh path, so removing the action's `revalidatePath` leaves its view stale. Removing
  one half without the other silently regresses the UI.
- **Server Actions that write data must call `revalidatePath`** for the routes that display it,
  even when the form is a client component inside a server page — otherwise stale HTML is served
  and client components never see updated props. If the action doesn't know the route (e.g. a
  shared toggle), pass the path segment as a hidden form field.
- **Slide-out (Sheet) editors follow the certifications-manager pattern.** Reference for any new
  Sheet CRUD editor: `SheetContent className="w-full overflow-y-auto sm:max-w-md"` →
  `SheetHeader` with `SheetTitle` **and** `SheetDescription` → form
  `className="flex flex-1 flex-col gap-4 px-4"` with a stable `id` → `<SheetFooter className="px-4">`
  with Save/Cancel wired via `form="the-form-id"`. The editor closes itself with
  `useEffect(() => { if (state?.ok) onDone(); }, [state, onDone])`. Skipping `px-4` leaves fields
  flush against the edge; skipping the form/footer wiring makes confirm-dialog submits no-ops.
- **ConfirmDialog must be paired with a form id.** Without the `formId` prop its confirm button
  is `type="button"` and closes the dialog without submitting — the delete silently never
  happens. Give the wrapping `<form>` a unique `id`, pass it as `formId`, keep hidden inputs
  inside that form.
- **Key-based remounting for uncontrolled inputs.** Changing a shadcn/Radix control's `key` prop
  remounts it, so the fresh instance picks up the new default. Simpler and more reliable than
  controlled state. Reference: `app/(internal)/assessments/[assessmentId]/finding-status-form.tsx`.
- **Match existing patterns before inventing new ones.** Subtle differences (a raw `<button>` vs.
  a shadcn `<Button>`) often cause breakage — read the closest existing component first.

## Docker & deployment gotchas

- **`npm install --production` is unreliable on Linux with a Windows-generated lockfile** (partial
  `node_modules`: missing `pg/esm/`, `postgres-array/index.js`, empty nested dirs). Use
  `COPY --from=deps /app/node_modules ./node_modules` then `npm prune --production --legacy-peer-deps`.
- **Add `--legacy-peer-deps` to every `npm install` / `npm ci` / `npm prune` in the Dockerfile.**
  Without it, peer conflicts (next-auth beta, nodemailer v9) cause ERESOLVE or silent failures.
- **`public/` must be tracked by git** (keep a `.gitkeep`). Empty dirs are invisible to git;
  `actions/checkout` and `COPY --from=build /app/public` then fail. Same for any explicitly
  copied directory.
- **Healthchecks must use `curl -f`**, not `node -e` (nested `function(){return…}` breaks on
  `dash`-based `node:22-slim`). `curl` is installed in the base stage.
- **`next-env.d.ts` is gitignored** — auto-generated, varies by environment, never commit it.
- **GHCR is preferred over Docker Hub** (built-in `GITHUB_TOKEN`, no separate credentials).
- **Branch protection required status checks must match the job name** (`quality`), not the
  workflow name (`CI`). Verify via the `contexts` field.

## RBAC — wire access-control in every change

Authorization is permission-based, not "is authenticated". Roles are DB-backed and hold
`resource:action` keys. Three system roles ship: **Admin** (all, locked), **Reviewer**,
**Viewer** (`*:view` only); admins can create custom roles. Catalog + defaults in
`lib/permissions.ts` (`PERMISSIONS`, `SYSTEM_ROLE_DEFINITIONS`); `hasPermission()` is the pure
helper there; `requirePermission()` lives in `lib/auth.ts`.

Every new/changed feature must:

1. **Define** its `resource:action` key(s) in `lib/permissions.ts` (reuse an existing key when
   one fits).
2. **Map** them into `SYSTEM_ROLE_DEFINITIONS` (Admin gets all; grant Reviewer/Viewer only what
   their intent allows) and reflect it in the seed so fresh + existing DBs converge.
3. **Enforce on the server** — guard every server action, route handler, and page with
   `requirePermission("<key>")`. Reads may use a `:view` key; writes must use the specific
   write/manage key. Never gate only on `requireUser()`.
4. **Gate the UI — hide, don't dangle.** Controls that trigger a gated action must be hidden
   (not greyed out) when the user lacks the permission, so a Viewer gets a clean read-only screen.
   Capture the user from the guard and wrap controls in
   `{hasPermission(user.permissions, PERMISSIONS.X) && ( … )}` in the server parent (keep child
   client widgets permission-agnostic). Keep read-only affordances (Export CSV, Download PDF,
   read-only comments/reviews). Hide sidebar items and settings tabs, and sanitize `?tab=`/route
   params against the user's allowed set. When hiding a control empties a container, hide the
   container too and fix empty-state copy.
5. **Test it** — allowed vs. denied, plus default-role key coverage. Where practical extend a
   Playwright spec (e.g. `e2e/rbac-viewer.spec.ts`) asserting a lower-privilege role does not see
   the gated controls.

UI hiding is cosmetic; the server guard is the real control — **both are always required.**

## Security & deployment invariants

- **CSP lives in `proxy.ts`** (Next 16 replacement for `middleware.ts`): nonce-based,
  `strict-dynamic`, applied **only to document GET requests** — never rewrite request headers on
  Server-Action POST/RSC requests (it drops the action result). Never add an inline `<script>`
  without threading the request nonce; add new external origins to the relevant CSP directive;
  scripts allow `'unsafe-eval'` (Next RSC + charting libs), styles rely on `'unsafe-inline'`. **Do
  not add `upgrade-insecure-requests`** — it breaks HTTP self-hosted deployments and same-origin
  Server Actions.
- **REST v1 handlers go through `runApiHandler` + `apiError`** (`lib/api-response.ts`):
  unexpected errors return a generic `500` (no internals), logged server-side.
- **Compare secrets in constant time** via `lib/timing-safe.ts` (e.g. `CRON_SECRET`). API keys are
  `mrk_<prefix>.<secret>` with an indexed `keyPrefix` lookup + a single bcrypt compare.
- **`lib/rate-limit.ts` is in-memory/per-process** — correct for the single-container Compose
  deployment; a shared store (Redis) is required only if scaled horizontally.
- **Deployment env musts:** `CRON_SECRET` is **required in production** (the app refuses to boot
  without it, except during `next build`); `TRUSTED_PROXY_COUNT` must match the real proxy hop
  count (default `0` ignores X-Forwarded-For) or client-IP rate-limiting and API-key IP
  allowlists degrade.
- **Runtime config lives in the DB, not files.** Operational settings (branding, email/SMTP,
  reminder cadence, escalation recipients, scoring weights/thresholds, file limits, users, roles,
  storage backend) are managed in-app via DB-backed Settings. Only deployment bootstrap belongs in
  env (`DATABASE_URL`, `AUTH_SECRET`, `APP_ENCRYPTION_KEY`, `CRON_SECRET`, `APP_URL`,
  `EVIDENCE_STORAGE_PATH`, `TRUSTED_PROXY_COUNT`, `CLIENT_IP_HEADER`). Secrets stored in Admin
  (e.g. SMTP password) are AES-256-GCM encrypted with `APP_ENCRYPTION_KEY` and never returned to
  the client. Never commit secrets or evidence files.
- **Data lifecycle.** Deleting a record must also delete its storage files; a replaced upload
  deletes the old file. The cron orphan sweep is the backstop, not the primary cleanup. **Every
  storage writer must be registered in the sweep's referenced-key set** in
  `lib/cron/run-jobs.ts` (evidence, attachments, brand logo, trust-center badge image,
  subprocessor logo) — a new key format not registered there is deleted within the hour. Deleting
  a user preserves audit/review history via nullable `SetNull` relations (shown as "Deleted
  user") — never cascade-delete audit trails.
- **Never expose evidence files via public URLs** — only through the authenticated route.
- **Keep the OpenAPI spec current.** When an endpoint is added/changed/removed, update
  `lib/openapi.json` (canonical) **and** `docs/public/openapi.json` in the same change. The spec
  powers `/api/docs` and Swagger UI at `/docs`. Every endpoint needs a summary, description, full
  parameter/response schemas, and error codes.

## Conventions

- TypeScript `strict`; validate all external input with zod. Never use `any` (use `unknown` +
  narrowing); type exported functions, props, and returns.
- **Do not add code comments unless explicitly requested.** When one is requested, explain *why*,
  not *what*.
- **Full descriptive names — no cryptic shorthand.** Never use single-letter variables outside
  loop indices (`i`, `j`) and standard math notation. Booleans read as predicates.
- **Small single-responsibility units**; guard clauses and early returns over nesting; no dense
  one-liners or stacked ternaries. Split chained `.filter().map().sort()` into named intermediate
  variables. Declare variables where first used. Use `for…of` (not `.reduce`/`.forEach`) when
  mutating or when you need early exit. Take options objects instead of boolean-trap parameters
  (`fn(data, { skipValidation: true })`). Match on specific error types; re-throw what you can't
  handle.
- **Styling = tokens only.** No hardcoded hex/spacing/radius/font sizes. Extend shadcn primitives
  via `cva` + `cn`; don't fork them.
- **Status colours are semantic.** UI chrome uses `--success`/`--destructive`; never reuse the
  user-configurable `--rag-*` palette (score/compliance indicators only).
- **No copy-paste.** If markup or logic appears twice, extract a component/function; a reused
  Prisma query belongs in `lib/db/`.
- **i18n is cookie-based** (`NEXT_LOCALE`): there are no `/[locale]/` URL segments and no
  next-intl middleware. Server components/actions use `getTranslations`; client components use
  `useTranslations`. Name the translator `translations`, **never `t`** — the repo bans
  single-letter variables. Keep `messages/en.json` and `messages/es.json` key-identical — a unit
  test enforces it. Resolution is cookie → org default (Admin → General) → `Accept-Language` →
  `en`. `setLocaleAction` only writes the cookie; the switcher calls `router.refresh()` (never
  `revalidatePath`). Translated: auth screens, internal shell, dashboard, vendors
  list/create/edit/detail, assessments list/create/detail/review, templates list/builder/preview/import,
  frameworks list/detail/controls/gaps/import, risk register, self-assessment, public trust center,
  vendor portal, emails, and PDFs. Internal pages are being translated area by area (admin forms;
  General, Appearance, Email, Email tracking, Scoring, Scheduling, Storage, Sign-in and Rate
  limits are done, remaining admin sections still to come). Email templates are admin-authored;
  only the built-in defaults are translated
  (`lib/settings/email-template-defaults.ts`) — customized templates are sent as written. PDFs
  follow the request locale via `getTranslations`/`getFormatter`; use those (not `formatDate()`,
  which is fixed to en-GB) for dates on translated surfaces.

## Windows / PowerShell tooling notes

- **Quote bracketed dynamic-route paths** for Prettier/Node (e.g. `"app/portal/[token]/page.tsx"`)
  — unquoted globs silently skip them.
- **`Select-String -Path` treats `[...]` as a wildcard class**, so searching a file under
  `app\portal\[token]\` matches nothing silently. Use `-LiteralPath` (and `Get-Content
  -LiteralPath`) for any bracketed path — this has caused false "file doesn't contain X" findings.
- **PowerShell string pipelines corrupt non-ASCII characters.** `Get-Content`/`-replace`/
  `Set-Content` decode UTF-8 as Windows-1252, turning `·`, `—`, `→`, `←` into mojibake (an
  em-dash becomes three garbled characters); this damaged shipped source and a UI placeholder.
  Never round-trip file text through PowerShell string ops. If a scripted edit is unavoidable, use
  `[IO.File]::ReadAllText`/`WriteAllText` with explicit UTF-8 and `[Text.UTF8Encoding]::new($false)`.
  `lib/no-mojibake.test.ts` scans `app/ components/ emails/ hooks/ lib/ docs/ scripts/` plus
  root-level markdown on every test run and fails on cp1252-mojibake — extend its patterns, never
  bypass it. Two traps: a four-digit `\u` escape in a JS replacement string inserts the literal
  escape text (JSX attributes never process it either) — always write real characters; and even
  the "safe" `[IO.File]` method has mangled bulk edits. For bulk text mutation prefer a Node script
  (like `scripts/bump-version.mjs`) with post-write corruption assertions, and `git diff` the
  result. Note the Grep tool does not detect these sequences; verify with byte/codepoint inspection
  (`[int][char]`).
- **Never run schema-less `UPDATE`/`DELETE` against a database — ever.** Debug surgery must be a
  scripted file with an explicit `WHERE`, parameterised values, and a row-count print before and
  after. An unscoped `UPDATE app_settings …` once wiped a deployment's whole settings table
  (SMTP, branding, org name).
- If `tsc` reports parse errors inside `.next/dev/types/routes.d.ts`, delete `.next` and rebuild —
  a killed dev server can leave generated route types corrupted.
- `npm install` rewrites `package.json`; if that trips `format:check`, it's a working-copy
  line-ending artifact — `git checkout`/`prettier --write` it (committed content is unchanged).

## Workflow

Work proceeds in **review-gated batches**; there is no external plan document. Work one batch at a
time, and do not start the next until the previous is reviewed. When a batch is done, run the
verification commands and present the changes, then stop and ask for sign-off. Keep this file
accurate as reality changes.

**Definition of Done — no placeholders.** Every delivered item must be: wired end-to-end
(UI ↔ Server Action/Route Handler ↔ Prisma ↔ Postgres, real persisted data, no mock arrays);
free of stubs (`TODO`/`FIXME`, empty/throwing bodies, dead code — intentional empty states are
fine if clearly labelled); clean under `lint`/`typecheck`/`build`; tested (new functions get
tests; changed ones update affected tests; core logic — especially scoring — has unit tests);
RBAC-wired per the section above; built on migrations that apply to a fresh DB with idempotent
seeds; and manually verified with results recorded.
