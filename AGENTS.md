# AGENTS.md

Operating guide for any agent or developer working in this repository.

## Project

**Mitch‑Risk** — a lightweight third party vendor risk management solution.
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
- **Local-disk volume** — evidence file storage behind a storage interface (save/read/delete/list; S3 and Azure Blob swappable via in-app Settings); files served only via an authenticated route
- **Built-in scheduler (default) -> `lib/scheduler.ts` via `instrumentation.ts`** — every 5 minutes: reminders, escalations, recurring assessments, audit-log & email-log pruning, orphaned-file sweep. Toggle in Settings → Scheduling; optional external triggering via secured `/api/cron/run`
- **Docker Compose** (app + Postgres), reverse proxy (Caddy/nginx) for TLS — self-hosted

## Repository layout (created during Phase 0)

```
app/                 # Next.js App Router
  (internal)/        # authenticated dashboard
    settings/         #   email-tracking, api-form, audit-form, health-tab, etc.
    risk-register/    #   cross-vendor findings register
    vendors/import/   #   CSV bulk vendor import
    templates/import/ #   JSON template import
    frameworks/import/ # CSV framework import
  (auth)/            # login, first-run setup
  portal/[token]/    # public vendor questionnaire (no login)
  api/               # cron, file serving, auth, REST API v1, Swagger docs
    attachments/[attachmentId]/ # authenticated file serving
    v1/                 #   REST v1 endpoints
      vendors/          #     vendor CRUD + import
        external/[externalId]/ # vendor lookup by external ID
      assessments/      #     assessment list + detail
      findings/         #     finding list + status update
      frameworks/       #     framework list + detail
      dashboard/        #     dashboard summary
      audit/            #     audit log
  docs/              # Swagger UI page
  style-guide/       # component showcase
components/          # shadcn ui primitives + domain composites
  ui/                # badge, button, card, chart, checkbox, combobox, command,
                     #   dialog, dropdown-menu, input, label, popover,
                     #   radio-group, select, separator, sheet, sidebar,
                     #   skeleton, sonner, stepper, submit-button, table, tabs,
                     #   textarea, tooltip, alert-dialog, form-field
  stat-card.tsx      # animated count-up stat cards
  empty-state.tsx    # SVG illustration empty states
  keyboard-shortcuts.tsx # ? key modal with g+letter navigation
  confirm-dialog.tsx # reusable confirmation modal for destructive actions
  idle-timer.tsx     # inactivity detection with countdown + auto-sign-out
  score-badge.tsx    # RAG-colored score pill
  review-panel.tsx   # collapsible review panel for assessments
  scroll-to-top.tsx  # floating scroll-to-top button
  vendor-attachments.tsx # vendor attachment list with upload/remove
  duplicate-template-menu-item.tsx # client wrapper for template duplication
  control-code-pills.tsx # collapsible control code pills
  progress-bar.tsx   # shared progress bar
  certifications-manager.tsx # certification CRUD with attachment display
  attach-evidence-button.tsx # dual-path evidence attachment (certification/general)
  breadcrumbs.tsx    # dynamic breadcrumb navigation
  search-input.tsx   # debounced search input
  pagination.tsx     # reusable pagination controls
  view-toggle.tsx    # cookie-backed rows/cards view switcher
  vendor-form.tsx    # vendor create/edit form
  auto-submit-select.tsx # select that auto-submits form on change
  pending-link.tsx   # link with spinner feedback for slow server-side generation
  page-main.tsx      # client wrapper for full-width dashboard
  assessment-timeline.tsx # interactive activity area chart
  permission-selector.tsx # grouped permission checkboxes (API key scoping, role editing)
  action-group.tsx   # responsive button group with mobile overflow
  app-sidebar.tsx    # internal layout sidebar with RBAC-gated nav items
  attention-groups.tsx # expandable needs-attention groups on dashboard
  bulk-findings-wrapper.tsx # checkbox selection + bulk toolbar for findings
  dashboard-charts.tsx # RAG donut + findings bar chart (recharts)
  evidence-preview.tsx # sheet-embedded preview for evidence PDFs and images
  page-skeleton.tsx  # composable loading skeleton component
  sparkline.tsx      # SVG sparkline for trend visualization
  vendor-timeline.tsx # chronological activity feed on vendor detail
  flash-toast.tsx    # cookie-based server-to-client toast messages
  scroll-lock-fix.tsx # MutationObserver fix for body overflow lock
  copy-link.tsx      # click-to-copy URL button
  template-preview.tsx # read-only template preview rendering
  assessment-status-badge.tsx # assessment status badge with label mapping
  theme-toggle.tsx   # light/dark theme toggle button
  user-menu.tsx      # user dropdown menu (profile, logout)
  vendor-export-button.tsx # CSV/JSON export button for vendor data
  data-table-column-header.tsx # sortable/hideable TanStack Table column header
  customer-responsibility-checklist.tsx  # customer responsibility checklist
  customer-responsibility-manager.tsx    # customer responsibility CRUD manager
  shared-responsibility-toggle.tsx       # shared responsibility toggle
  theme-provider.tsx                     # next-themes provider wrapper
  question-form.tsx                      # template question editor
  conditional-rules-editor.tsx           # conditional logic rule builder
  control-multi-select.tsx               # multi-select for framework controls
  compliance-radar.tsx                   # recharts radar of framework domain compliance
  url-tabs.tsx                           # ?tab= URL-synced tabs
  auth/sso-buttons.tsx                   # SSO login buttons
lib/                 # cross-cutting logic
  actions/           # server actions (assessments, collaboration, portal, templates, users, vendors)
    findings.ts      #   finding status updates
    frameworks.ts    #   framework CRUD + CSV import
    certifications.ts  # vendor certification CRUD + responsibility generation
    roles.ts           # role CRUD + duplicate
    auth.ts            # sign-out, password reset, break-glass
    customer-responsibility.ts # responsibility action updates
    profile.ts         # profile update
  db/                # typed data-access layer (assessments, audit, collaboration,
                     #   compliance, frameworks, notifications, roles, scoring, templates, users, vendors)
    audit.ts           #   logAudit() + AUDIT_ACTIONS constant (single source of truth for audit event types)
    certifications.ts  # certification CRUD + attachments
    dashboard.ts       # dashboard metrics + upcoming dates
    customer-responsibility.ts # customer responsibility compliance
    findings.ts        # finding list, get, update status
    vendor-timeline.ts # chronological vendor activity feed
    webhooks.ts        # webhook endpoint CRUD
    audit-types.ts     # audit type definitions
    notifications-types.ts # notification type definitions
  email/             # Nodemailer mailer + token replacer
  schemas/           # shared zod schemas + inferred types
    framework.ts     #   framework + CSV import schema
    certification.ts #   vendor certification schema
    auth.ts          #   credentials, password reset, profile update, user create, setup admin
    portal.ts        #   portal answer + progress save schemas
    vendor.ts          # vendor schema
    template.ts        # template schema
    role.ts            # role schema
    assessment.ts      # assessment schema
  settings/          # DB-backed operational config (schema, accessor, read/write)
  api-keys.ts        # API key generation, bcrypt hashing, CIDR IP matching
  api-auth.ts        # unified authenticateRequest() — session + Bearer token + permission check
  api-response.ts    # shared API error wrapper (runApiHandler + apiError)
  nav.ts             # buildBackParam / resolveBackHref / resolveTab navigation-state helpers
  api/               # shared API response builders
    vendor-detail.ts #   buildVendorDetailResponse (used by vendor + external-ID lookup routes)
  auth.ts            # Auth.js config + permission guards (requirePermission/hasPermission)
  break-glass.ts     # SSO-only login bypass: token gen/hash/verify + show-local-auth rule
  client-ip.ts       # proxy-aware client IP (trusted-hop X-Forwarded-For / CLIENT_IP_HEADER)
  control-selection.ts # per-framework tri-state "select all" logic
  crypto.ts          # AES-256-GCM encryption for secret settings
  csv-parser.ts      # shared CSV parser (handles quoted fields, CRLF line endings)
  dashboard-insights.ts # pure dashboard computation helpers
  env.ts             # zod-validated deployment env
  json.ts            # deep-clone helper for JSON-safe values
  openapi.json       # OpenAPI 3.0 spec powering Swagger UI at /docs
  pdf-report.tsx     # @react-pdf/renderer assessment report generator
  framework-report.tsx # @react-pdf/renderer framework compliance report generator
  portfolio-report.tsx # @react-pdf/renderer portfolio PDF report generator
  permissions.ts     # RBAC permission catalog, default system roles, permission helpers
  portal.ts          # portal state machine (visibility, required questions)
  prisma.ts          # shared Prisma client instance
  rate-limit.ts      # in-memory fixed-window rate limiter
  scoring.ts         # weighted scoring engine + compliance checker
  scheduler.ts       # built-in cron: interval tick + overlap lock + runScheduledJobsOnce()
  session.ts         # computeSessionExpiry() — JWT `exp` sliding-window helper
  theme-tokens.tsx   # server-rendered CSS variable injection (brand colours)
  timing-safe.ts     # constant-time string comparison
  tokens.ts          # opaque portal token generation + expiry
  upload-validation.ts # file upload MIME type validation
  utils.ts           # cn(), formatDate(), formatPercent(), getField(), formatResponseValue(), csvEscape()
  view-preference.ts # cookie-backed view preference (rows/cards)
  webhooks.ts        # HMAC-signed webhook dispatch to configured endpoints
  compare.ts         # assessment comparison helper (ResponseDiff, compliance change detection)
  radar-labels.ts    # short axis label generation for compliance radar (dedup, collision-safe)
  storage/           # file storage interface (save/read/delete/list)
                     #   local-disk, s3.ts (AWS S3), azure.ts (Azure Blob)
                     #   orphan-sweep.ts (cron orphan classification — pure, unit-tested)
hooks/              # React hooks (use-form-toast, use-action-feedback, use-mobile)
emails/              # React Email templates: dynamic.tsx renders all configured templates from Settings (invite, reminder, escalation, etc.) via token replacement
prisma/              # schema.prisma, migrations, seed.ts, seed-runner.cjs, seed-demo.ts, seed-radar-demo.ts
  seed-data/         # ISO 27001, SOC 2, NIST CSF, Essential Eight seed data + types
    templates/       #   full out-of-the-box questionnaire templates (one per framework)
scripts/             # backup.sh, backup.ps1
e2e/                 # Playwright end-to-end tests
docs/                # VitePress-powered user documentation site (GitHub Pages)
                     #   docs/.vitepress/ — config, theme, custom CSS
                     #   docs/public/openapi.json — served by the static docs site;
                     #     keep in sync with lib/openapi.json (the canonical source)
                     #   .github/workflows/docs.yml — auto-deploys on push to master
                     #     when docs/** changes
proxy.ts             # Next.js 16 proxy (CSP nonce + security headers)
```

## Commands

These npm scripts are defined in `package.json` (created in Phase 0). Run the relevant
ones before declaring any phase complete.

- `npm run dev` — local dev server
- `npm run build` — production build (must pass before any gate sign-off)
- `npm run lint` — ESLint (must be clean before any gate sign-off)
- `npm run typecheck` — `tsc --noEmit` (must be clean before any gate sign-off)
- `npm run format:check` — Prettier check (clean before any gate sign-off); `npm run format` to fix
- `npm run precheck` — run typecheck + lint + format:check in sequence (same checks as CI)
- `npm run test` — unit + integration tests (Vitest). **Integration tests delete/reset DB data
  and refuse to run unless pointed at a test database.** Set `TEST_DATABASE_URL` to a dedicated
  DB (name must contain `test`) — never run against dev/prod. See README → Testing.
- `npm run test:e2e` — end-to-end tests (Playwright)
- `npm run db:migrate` — apply Prisma migrations
- `npm run db:seed` — run seed script
- `npm run docs:dev` — VitePress docs dev server with hot reload
- `npm run docs:build` — build VitePress docs for production
- `npm run docs:preview` — preview the built docs locally
- `docker compose up` — app + Postgres for local/self-host

> If a command above does not yet exist for the phase you are in, create it as part of
> that phase rather than skipping verification.

### Verification gotchas (learned the hard way)

- **e2e runs against the _production_ build.** Playwright's `webServer` is `npm run start`, so
  the suite exercises `next build` output (dev and prod behave differently — e.g. Server-Action
  result delivery). `npm run start` runs in production mode and **requires `CRON_SECRET`**; the
  Playwright config injects one via `webServer.env`. Locally, `reuseExistingServer` reuses a server
  you already have up; in CI it starts a fresh production server. Do not assume a green `dev` run
  means prod is green — verify with a production build.
- **Apply new Prisma migrations to _both_ the dev DB and the test DB** (`prisma migrate deploy`
  against each; the test DB is `TEST_DATABASE_URL`) before running `npm run test`, or integration
  tests fail on missing columns.
- **Never point `TEST_DATABASE_URL` at the dev/prod database — even with
  `ALLOW_TESTS_ON_THIS_DB=1`.** Integration suites reset whole tables: the settings-isolation
  suite snapshots-and-restores all of `app_settings`, but a wipe mid-run still takes the target
  database down briefly, and other suites mutate rows in place. This bit us for real: runs
  against dev erased live SMTP/branding/scoring settings. Standard setup:
  `CREATE DATABASE mitch_risk_test;` then `$env:DATABASE_URL="postgresql://mitch:mitch@localhost:5432/mitch_risk_test?schema=public"; npx prisma migrate deploy`,
  then run tests with `TEST_DATABASE_URL` pointing there and **no** override flag. The override
  prints a loud banner when used — treat it as a last resort only. Any new integration test that
  writes to `app_settings` (or another shared table) must snapshot before and restore after,
  following `save-settings.integration.test.ts`.
- **CI runs typecheck + lint + format:check + build on every push.** The same checks are available
  locally via `npm run precheck` (typecheck + lint + format:check). Run `npm run format` to auto-fix
  formatting issues before pushing — Prettier failures are the most common CI rejection.
- **Server Actions that feed `useActionState`.** An action that returns a value for
  `useActionState` should prefer to let the client handle the refresh via the
  `useActionFeedback` hook (toast + `router.refresh()`) rather than calling `revalidatePath`
  for its own current route from inside the action. Doing both causes a redundant
  double-refresh but is harmless: Sonner toasts render via `<Toaster />` portal
  (`components/ui/sonner.tsx`) and survive route refetches. When an action is also called
  from non-`useActionState` contexts (e.g. API routes, cron), calling `revalidatePath` is
  fine — the double-refresh only matters when the client also calls `router.refresh()`.

### Client/Server state patterns (learned the hard way)

- **Key-based remounting for uncontrolled inputs.** When a shadcn/Radix form control
  (`<Select>`, `<Checkbox>`, etc.) uses `defaultValue`/`defaultChecked` inside a form
  that persists via a Server Action, React only reads the default on initial mount. If
  the server component re-renders with a new prop value after `revalidatePath`, the
  control keeps its stale internal state. Fix: add `key={currentValue}` to the control —
  React unmounts and remounts it, and the fresh instance picks up the new default. This
  is simpler and more reliable than controlled state (`useState` + `value` +
  `onValueChange`). The canonical reference is `finding-status-form.tsx:38`.
- **Server Actions that write data must call `revalidatePath`** for the routes that
  display that data — even when the form is a client component rendered inside a server
  page. The server component only re-renders when the path is revalidated; without it,
  the stale HTML is served and client components never receive updated props. If the
  action does not know the route (e.g. a shared toggle component), pass the path segment
  as a hidden form field.
- **Match existing patterns before inventing new ones.** The codebase already has proven
  solutions — the review panel's expand/collapse (`Button` + `setExpanded((prev) => !prev)`),
  the finding status form's key-remounting, the `useActionFeedback` hook for
  toast + refresh. Read the existing similar component first and replicate its approach
  exactly before writing your own. Subtle differences (e.g. a raw `<button>` vs. a
  shadcn `<Button>`) often cause breakage.

### Docker & deployment gotchas

- **`npm install --production` is unreliable on Linux with a Windows-generated
  lockfile.** It can produce partial `node_modules` — `pg/esm/` missing,
  `postgres-array/index.js` absent, nested dependency directories empty. The fix:
  `COPY --from=deps /app/node_modules ./node_modules` (the full install from the
  `deps` stage) followed by `RUN npm prune --production --legacy-peer-deps`.
  `prune` only removes devDependencies — it never touches files within installed
  packages.
- **Add `--legacy-peer-deps` to every `npm install` / `npm ci` / `npm prune` in the
  Dockerfile.** Without it, peer dependency conflicts (common with `next-auth` beta
  and `nodemailer` v9) cause silent failures or ERESOLVE errors at build time.
- **`public/` must be tracked by git** (at minimum a `.gitkeep` file). Empty
  directories are invisible to git. `actions/checkout` won't create them, `COPY . .`
  in the Docker build stage won't have them, and `COPY --from=build /app/public`
  in the runner stage fails with "not found". Same applies to any directory the
  Dockerfile copies explicitly.
- **Docker healthchecks should use `curl -f`, not `node -e`.** The `node -e` pattern
  with nested `function(){return...}` parentheses breaks on `dash`-based shell images
  (`node:22-slim`). `curl -f http://localhost:3000/api/health || exit 1` works
  everywhere. Install `curl` in the base stage.
- **`next-env.d.ts` is in `.gitignore`** — it's auto-generated by `next dev`/`next build`
  and can differ between environments. Never commit it.
- **GHCR is preferred over Docker Hub.** GitHub Container Registry uses the built-in
  `GITHUB_TOKEN` — no separate credentials to create, rotate, or leak. Public images
  have no pull rate limits.
- **Branch protection required status checks** must match the **job name** (e.g.
  `quality`), not the workflow name (e.g. `CI`). Check the `contexts` field in
  the protection API response to verify.



Work proceeds in **review-gated batches** (e.g. audit remediation batches). There is no
external plan document; each batch's scope and sign-off are agreed in conversation, and this
file stays accurate as reality changes.

Rules:

1. Work one batch at a time, in order. Do not start a new batch until the previous one has
   been reviewed.
2. When a batch's work is done, run the verification commands and present the changes for
   review. Then stop and ask for sign-off.
3. Keep this file accurate as reality changes.

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

### Code should look human-written

Good code reads like a human being wrote it for another human being to maintain. Avoid
patterns that require the reader to be a TypeScript expert or to hold complex state in
their head:

- **Prefer clarity over cleverness.** A 5-line `if/else if/else` chain is always better than a
  nested ternary or a `match/case` that requires the reader to decode what each branch means.
  Nobody should have to squint at a line to understand what it does.
- **One thought per line.** No dense one-liners that do three things at once (e.g.
  `.filter().map().sort()` all on one line). Break chained operations into intermediate
  variables with descriptive names — the compiler will optimise them anyway.
- **Straightforward control flow.** Use early returns and guard clauses. Functions should read
  top-to-bottom like a story, not require jumping between indentation levels to follow logic.
- **No over-engineered abstractions.** Do not create a helper function, class, or generic just
  because a two-line check is repeated twice in the same file. Inline it. Do not create
  wrappers that add zero behaviour over what they wrap. Every abstraction must pay for itself
  by reducing total cognitive load, not increasing it.
- **Duplicate code is noise.** If logic appears in two places, extract it into a shared location
  (function in `lib/`, component in `components/`). The DRY rule is strict in this repository
  — see "Reusability & DRY" above.
- **Errors should be specific.** Do not catch a broad exception and surface a generic message
  that could also mean "database is down" or "network timeout". Match on the actual error type
  or code. Re-throw what you cannot handle.
- **Your code should pass the "read aloud" test.** If you cannot read a line out loud and have
  it sound like a plain-English instruction, rename the variables until you can.

**Concrete anti-patterns — avoid these:**

| Pattern | Problem | Do instead |
|---|---|---|
| `+!!foo` or `~~foo` | Implicit coercion tricks no one reads fluently | `Number(foo)` or `Math.floor(foo)` |
| `const { data } = await fn()` destructuring into generic names | Loses what `data` actually is | `const { data: vendors }` or just `const result = await fn()` |
| `Array.reduce()` for building objects or side-effects | `reduce` signals "fold/accumulate" — a `for` loop is clearer for mutation | `for...of` when mutating; `reduce` only for pure accumulation |
| `.forEach()` when you need `break`/`continue` | `forEach` can't early-exit | `for...of` with `break` or `continue` |
| Boolean trap parameters: `fn(data, true, false)` | Caller can't tell what `true`/`false` mean | Options object: `fn(data, { skipValidation: true })` |
| Mutation of function parameters | Surprises the caller when their input changes | Clone or return a new value |
| Variables declared far from their use | Forces the reader to scroll and remember | Declare at the point of first use |
| Regex that takes >10 seconds to parse by eye | Regex is write-once, read-never | Split into named sub-patterns or use a parser |
| Side effects inside getters or property access | `obj.foo` looks pure but isn't | Make it an explicit method: `obj.getFoo()` |
| Implicit `any` from untyped catch / destructure | Hides type errors until runtime | Type catch as `unknown`; type all destructures |

## Role-based access control (build access-control in, every time)

Authorization is permission-based, not "is authenticated". Roles are DB-backed
(`Role` model) and carry a set of `resource:action` permission keys. Three system roles ship
by default — **Admin** (all permissions, locked), **Reviewer** (write + review), and
**Viewer** (read-only) — and admins can create custom roles with any subset of permissions.
The permission catalog, default role mappings, and helpers live in `lib/permissions.ts`; the
guards (`requirePermission`, `hasPermission`) live in `lib/auth.ts`. See `ARCHITECTURE.md`
§5 for
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
  cadence, escalation recipients, scoring weights & thresholds, file limits, users, roles,
  storage backend) are managed
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
  the backstop, not the primary cleanup. **Every storage writer must be reflected in the
  sweep's referenced-key set** (`app/api/cron/run` collects evidence, attachment, and logo
  keys) — adding a new key format without registering it there means the cron will delete
  those files within an hour. Deleting a user preserves audit and review history via
  nullable `SetNull` relations (surfaced as "Deleted user") — never cascade-delete audit trails.
- Prefer Server Components for reads and Server Actions for writes.
- **Keep the OpenAPI spec current.** Whenever a new API endpoint is added, modified, or
  removed, update `lib/openapi.json` in the same phase. The spec lives at `/api/docs` and
  powers the Swagger UI at `/docs`. Copy any updates to `docs/public/openapi.json` so the
  static VitePress docs site stays in sync. Every endpoint must have a summary, description,
  full parameter schemas, response schemas, and error codes. This ensures citizen developers
  and SIEM integrations always have accurate API documentation.

## Security & deployment invariants

- **CSP lives in `proxy.ts`** (the Next 16 replacement for `middleware.ts`): a nonce-based,
  `strict-dynamic` policy applied **only to document GET requests** — never rewrite request
  headers on Server-Action POST/RSC requests (it drops the action result). Never add an inline
  `<script>` without threading the request nonce; new external origins (e.g. a CDN) must be added
  to the relevant CSP directive; scripts allow `'unsafe-eval'` (required by Next.js RSC and
  charting libraries); styles rely on `'unsafe-inline'`. **Do not add
  `upgrade-insecure-requests`** — it breaks HTTP-accessed self-hosted deployments and same-origin
  Server Actions.
- **REST v1 handlers** go through `runApiHandler` + `apiError` (`lib/api-response.ts`): unexpected
  errors return a generic `500` (no internals), logged server-side.
- **Compare secrets in constant time** via `lib/timing-safe.ts` (e.g. `CRON_SECRET`). API keys are
  `mrk_<prefix>.<secret>` with an indexed `keyPrefix` lookup + a single bcrypt compare.
- **Rate limiter** (`lib/rate-limit.ts`) is in-memory/per-process — correct for the single-container
  Compose deployment; a shared store (Redis) is required only if scaled horizontally.
- **Deployment env musts:** `CRON_SECRET` is **required in production** (the app refuses to boot
  without it, except during `next build`); `TRUSTED_PROXY_COUNT` must match the real proxy hop
  count (default `0` = X-Forwarded-For ignored) or client-IP rate-limiting and API-key IP
  allowlists degrade.

## Windows / PowerShell tooling notes

- **Quote bracketed dynamic-route paths** for Prettier/Node (e.g. `"app/portal/[token]/page.tsx"`);
  unquoted globs silently skip them.
- **`Select-String -Path` treats `[...]` as a wildcard character class** — searching a file
  under `app\portal\[token]\` with `-Path "app\portal\[token]\page.tsx"` matches nothing,
  silently. Use `-LiteralPath` (and `Get-Content -LiteralPath`) for any path containing
  brackets; this has caused false "file doesn't contain X" conclusions during audits.
- **PowerShell string pipelines corrupt non-ASCII characters in source files.**
  `Get-Content` / `-replace` / `Set-Content` decode UTF-8 as Windows-1252, turning
  `·`, `—`, `→`, `←` into `Â·`/`â€"`-style mojibake; several shipped source lines were
  damaged this way (an assessments-table due-date placeholder rendered garbled in the UI).
  Rules: never round-trip file text through PowerShell string ops — if a scripted edit is
  unavoidable, use `[IO.File]::ReadAllText`/`WriteAllText` with explicit UTF-8 and
  `[Text.UTF8Encoding]::new($false)`; commit-message/pr-body files likewise. `lib/no-mojibake.test.ts`
  now scans `app/ components/ emails/ hooks/ lib/` on every test run and fails on any
  cp1252-mojibake sequence — extend its patterns rather than bypassing it. Note the Grep
  search tool cannot detect these sequences (it decodes differently); verify encoding with
  byte/codepoint inspection (`[int][char]`) when corruption is suspected. Two extra traps:
  JS replacement strings like `"\\u2014"` insert the LITERAL escape text (JSX attributes
  render it verbatim) — always write real characters; and JSX attribute values never
  process `\uXXXX` escapes, unlike JS string literals.
- If `tsc` reports parse errors inside `.next/dev/types/routes.d.ts`, delete `.next` and rebuild —
  a killed dev server can leave the generated route types corrupted.
- `npm install` rewrites `package.json`; if that leaves it flagged by `format:check`, it's a
  working-copy line-ending artifact — `git checkout`/`prettier --write` it (the committed content
  is unchanged).
