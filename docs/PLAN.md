# mitch-risk — Project Plan

A lightweight vendor risk management platform, inspired by UpGuard's questionnaire and
framework-alignment features, deliberately kept simple and easy to manage.

## 1. Goals & non-goals

**Goals**

- Build, version, and reuse security questionnaires (custom + starter templates).
- Send questionnaires to vendors via a no-login, expiring secure link.
- Auto-score responses and roll them up into a dynamic vendor risk profile.
- Map questions to ISO 27001 / SOC 2 controls and show per-vendor gap heatmaps.
- Capture evidence, findings, and reviewer collaboration.
- Automate reminders, escalations, and recurring assessments.

**Non-goals (v1)**

- External attack-surface scanning / continuous monitoring (manual or API-driven evidence only).
- Vendor marketplace, complex role hierarchies, or heavy configuration surfaces.

## 2. Decisions log

| Area | Decision |
|------|----------|
| App framework | Next.js (App Router) + TypeScript |
| Database / ORM | PostgreSQL + Prisma |
| UI | Tailwind CSS v4 + shadcn/ui, themed via CSS-variable design tokens |
| Design source | Official shadcn/ui Figma kit; manual token mapping (no MCP) |
| Theme | Light + dark; **neutral default token set now**, swap to brand Figma tokens later (token values only, no refactor) |
| Internal auth | Auth.js (NextAuth v5) |
| Vendor portal auth | Opaque, expiring, revocable DB token in URL (no login) |
| Email | Generic SMTP-with-auth via Nodemailer; SendGrid initially; React Email templates |
| Evidence storage | Local-disk volume now, behind a storage interface (S3/MinIO swappable); served only via authenticated route |
| Scheduling | System cron -> secured `/api/cron/run` (no Redis in v1) |
| Deployment | Docker Compose (app + Postgres) + reverse proxy for TLS; self-hosted |
| Runtime configuration | Operational/end-user settings managed **in-app** (DB-backed, ADMIN role); only deployment bootstrap/secrets live in env. Secrets stored in settings are encrypted at rest. |

## 3. Architecture

- **App structure** — `app/(internal)` authenticated dashboard; `app/portal/[token]` public
  questionnaire; `app/api/*` for cron, file serving, and auth. Reads via Server Components,
  writes via Server Actions / Route Handlers.
- **Internal auth** — Auth.js with roles `ADMIN` and `REVIEWER`.
- **Vendor portal token** — On send, an assessment gets a cryptographically random opaque
  token with `tokenExpiresAt`. The portal validates existence + expiry + status server-side.
  Tokens can be revoked, regenerated, or extended by internal staff.
- **Email** — A thin `mailer` module (`sendMail({ to, subject, html })`) over Nodemailer SMTP.
  Config is env-driven (`SMTP_HOST/PORT/SECURE/USER/PASS`, `MAIL_FROM`, `MAIL_FROM_NAME`).
  SendGrid SMTP relay: host `smtp.sendgrid.net`, port `587`, user `apikey`, pass = API key.
- **Storage** — A `storage` interface with a local-disk implementation; files written to a
  configured volume, metadata in Postgres, downloads streamed through an authenticated route.
- **Scheduling** — System cron calls `POST /api/cron/run` with a `CRON_SECRET` header; the
  handler scans for due reminders, overdue escalations, and recurring assessments, recording
  sends in `NotificationLog` for idempotency.
- **Runtime configuration & settings** — All operational, end-user configuration is managed
  inside the product via a DB-backed **Settings** area (ADMIN role): organization & branding,
  email/SMTP, assessment defaults & reminder cadence, escalation recipients, scoring weights &
  RAG thresholds, file-upload limits, and user management. Settings are typed and zod-validated
  via `lib/settings` with seeded defaults; secret values (e.g. SMTP password) are encrypted at
  rest with `APP_ENCRYPTION_KEY` and never returned to the client. **Only** deployment
  bootstrap/infra stays in env: `DATABASE_URL`, `AUTH_SECRET`, `APP_ENCRYPTION_KEY`,
  `CRON_SECRET`, `APP_URL`, and the storage path. A first-run setup creates the initial admin,
  so no file editing is needed to start managing the running product. (This in-app split is for
  end-user operation — not product build/dev config such as tsconfig or ESLint.)

## 4. Data model

Built from the provided ERD plus the fields needed for scoring, review, and scheduling.

- **User** — internal staff; role `ADMIN` | `REVIEWER`.
- **Vendor** — name, contact, tier/criticality, cached `overallScore`, `lastAssessedAt`.
- **Framework** -> **Control** — `Control` has `domain`, `code`, `title`, `guidance`.
- **Template** -> **Section** -> **Question**; **Question** <-> **Control** via **QuestionControl** (m:n).
  - `Question.type`: `YES_NO` | `MULTIPLE_CHOICE` | `FREE_TEXT` | `FILE_UPLOAD` | `DATE` | `NUMERIC`.
  - `Question` also: `helpText`, `riskWeight` (`CRITICAL/HIGH/MEDIUM/LOW` -> numeric),
    `expectedAnswer`, `options` (JSON), `required`, `conditionalLogic` (JSON show/hide), `order`.
- **Template versioning** — Templates carry a version + status (`DRAFT/PUBLISHED/ARCHIVED`).
- **Assessment** (the "Request") — `vendorId`, `templateId`, `title`, `status`
  (`DRAFT/SENT/IN_PROGRESS/SUBMITTED/UNDER_REVIEW/COMPLETED/OVERDUE`), `dueDate`, `reviewerId`,
  `accessToken`, `tokenExpiresAt`, `recurrence` (`NONE/QUARTERLY/ANNUAL`), `nextRunAt`, cached `score`.
- **AssessmentQuestion** — frozen snapshot of the template's questions (and their mapped control
  IDs) at send time, so in-flight assessments are never altered by later template edits.
- **Response** — `value` (JSON, handles all types), `isCompliant` (bool|null), `isNA` (bool),
  `weightedScore`, `maxScore`, `answeredAt`.
- **Evidence** — file + optional note, linked to a response; `fileName`, `key`, `mimeType`,
  `sizeBytes`, `uploadedBy`.
- **Finding** (gap) — auto-generated on non-compliant answers; `severity` from risk weight,
  linked control(s), `status` (`OPEN/REMEDIATED/RISK_ACCEPTED`).
- **Comment** — threaded, per question, `authorType` `INTERNAL` | `VENDOR`.
- **AnswerReview** — reviewer `decision` `APPROVED` | `REJECTED` | `CLARIFICATION_REQUESTED` + note.
- **NotificationLog** — record of invites/reminders/escalations for idempotency.
- **AuditLog** (optional) — who did what, when.
- **AppSetting** — DB-backed operational configuration as typed, zod-validated records
  (`category`, `key`, JSON `value`, `isSecret`). ADMIN-managed via the in-app Settings screen;
  `isSecret` values are encrypted at rest and never returned to the client in plaintext.

## 5. Scoring rules

- Per question: `weightedScore = weight x compliance(0|1)` vs `expectedAnswer`; `maxScore = weight`.
- Questionnaire % = `sum(weightedScore) / sum(maxScore)` over applicable questions.
- **N/A excluded** from numerator and denominator by default.
- Auto-scorable types: `YES_NO`, `MULTIPLE_CHOICE`, `NUMERIC` (threshold), `DATE` (not expired).
  `FREE_TEXT` / `FILE_UPLOAD` and any unscored item start `isCompliant = null` and are scored by a
  reviewer during the review flow.
- **Control compliance %** = compliant / applicable answers mapped to that control; drives the
  red/amber/green heatmap. v1 uses the latest completed assessment per vendor; historical
  aggregation is a documented enhancement.

## 6. Frameworks & licensing notes

- Ship **ISO 27001:2022** Annex A controls and **SOC 2** Trust Services Criteria as
  `code + title + our own short guidance` — not the verbatim copyrighted standard text.
- Ship **CAIQ-Lite** (CSA; verify redistribution terms) plus editable **ISO 27001** and
  **SOC 2** starter questionnaires with question->control mappings pre-wired.
- **SIG is proprietary** (Shared Assessments) and is **not** bundled; users can build their own.

## 7. Phase roadmap

Each phase is independently shippable and gated (see `STAGE-GATES.md`).

- **Phase 0 — Foundations.** Next.js+TS, Tailwind v4 + shadcn init, neutral token contract,
  light/dark + toggle, app shell (sidebar + topbar), Prisma + Postgres, Auth.js internal login,
  zod-validated env, **DB-backed Settings infrastructure (`lib/settings`, typed + encrypted
  secrets) + admin Settings shell + first-run admin setup**, Docker Compose, npm scripts,
  `/style-guide` showcase.
- **Phase 1 — Frameworks & Controls.** Models + idempotent seed of ISO 27001:2022 & SOC 2; browse/search UI.
- **Phase 2 — Templates & question bank.** Builder for sections/questions (6 types, weights,
  expected answers, options, conditional logic), control mapping, publish/version + snapshot strategy.
- **Phase 3 — Vendors, assessments & vendor portal.** Vendor CRUD; launch assessment; question
  snapshot; opaque expiring token; no-login portal with autosave, conditional logic, evidence
  upload, per-question comments; submit + validation; token revoke/extend.
- **Phase 4 — Scoring, findings, profile, heatmap.** Scoring engine, auto-findings, vendor risk
  profile (overall %, domain breakdown, trend history), control heatmap + dashboards.
- **Phase 5 — Collaboration.** Threaded comments and reviewer approve/reject/request-clarification,
  reopen-on-rejection, manual scoring tie-in.
- **Phase 6 — Email, reminders, scheduling.** Nodemailer/SMTP (configured in-app via Settings,
  with a test-send) + React Email templates; secured cron; reminder offsets + overdue escalation
  (idempotent); recurring assessments; starter templates seed.
- **Phase 7 — Polish.** Audit log, CSV/PDF export, finalize all in-app Settings surfaces
  (branding, email, reminders, scoring weights/thresholds, file limits, users) + brand controls,
  hardening (portal rate-limiting, headers), full test suite, deployment docs, brand-token swap.
- **Phase 8 — Settings page tabs.** Wrap the existing `/settings` cards in a shadcn `Tabs`
  component (General / Email / Scoring / Users) so the growing configuration surface stays
  manageable. No new data model — only the layout changes; existing forms and actions are
  untouched.
- **Phase 9 — User management.** Manage internal staff accounts from within the app. Users
  list/add/edit/disable on `/settings` (Users tab); roles ADMIN/REVIEWER; password change +
  admin‑reset; first user via `/setup`, subsequent users added in‑app. Light activity log
  (login, assessment send, review decision).
- **Phase 10 — SSO / third‑party auth.** Microsoft Entra ID (OIDC) and Google Workspace
  (OAuth) via Auth.js v5 providers. Enable/disable per‑provider and configure client‑id/secret
  via in‑app Settings (encrypted, like SMTP). Hybrid sign‑in: password + SSO buttons on
  `/login`. Auto‑provision on first SSO sign‑in with a configurable default role. Domain
  restriction optionally enforces `@company.com` only. Existing password users are
  unaffected.
- **Phase 11 — Additional question types.** Extend the template builder with new answer
  types: combobox (searchable single‑select from a large option list), multi‑select
  checkboxes, and a 1‑5 rating scale. Each type integrates into the builder UI, the portal
  questionnaire, autoscoring, and the review panel. No schema migration needed — the
  existing `QuestionType` enum is extended (Prisma supports adding enum variants).
- **Phase 12 — Portfolio dashboard + vendor trends.** A single‑screen overview of all vendor
  risk: vendor list with latest scores, tiers, overdue assessments; a portfolio‑wide gap
  summary ("8 of 12 vendors are deficient on A.8.5 — MFA"); a lightweight trend chart on the
  vendor profile showing the last N assessment scores over time.
- **Phase 13 — Richer starter templates + template import/export.** Meaningful out‑of‑box
  questionnaires: ISO 27001 Starter (~20‑25 questions) and SOC 2 Starter (~15‑20) with
  pre‑mapped controls (seed only). Export a template as JSON (download button) and import a
  JSON template (upload, validates shape, creates a DRAFT).
- **Phase 14 — Evidence preview + CSV export.** In‑browser preview of uploaded PDFs and
  images on the assessment detail. One‑click CSV export of assessment responses + findings.
- **Phase 15 — Self‑assessment + comparison + API.** Let the business self‑assess against
  ISO/SOC 2 using the same portal and receive a gap report. Side‑by‑side comparison of two
  assessments for the same vendor. A light REST API for creating assessments and reading
  scores, for integration with other tools.
- **Phase 17 — Hardening.** Portal rate limiting (in-memory token bucket on autosave + token
  validation); conditional OIDC provider registration (disabled providers never expose
  endpoints); clean up `as any` casts in `lib/auth.ts`; compound database indexes on
  `Assessment(vendorId, status)`, `Response(assessmentId, isCompliant)`, and
  `Comment(assessmentId, assessmentQuestionId)`; Docker app healthcheck.
- **Phase 18 — Test coverage expansion.** Expand from 26 to ~50 tests covering post-Phase 4
  logic: COMBOBOX/MULTI_SELECT/RATING scoring compliance, finalize/reopen state transitions,
  import validation (malformed JSON, unknown types, bad control codes), domain compliance
  edge cases (unmapped controls), portal token expiry/revoke/regenerate, SSO auto-provision
  and domain restriction, and the API score endpoint.
- **Phase 19 — PDF assessment report.** A polished PDF report of a vendor's risk profile,
  assessment responses, findings, and domain compliance bars — the artifact stakeholders
  actually share with auditors and clients. Uses `@react-pdf/renderer`; downloadable from the
  assessment detail page; branded with the org name from Settings.
- **Phase 20 — In-app notifications.** A notification badge in the sidebar with live counts
  of unreviewed submissions, overdue assessments, and rejected answers awaiting vendor.
  Lightweight `Notification` model (per-user, per-assessment, readable, mark-as-read on
  click-through). Server-driven count from the layout — turns the tool from passive
  (email-only) to active.
- **Phase 21 — Assessment search & cross-vendor comparison.** Search/filter bar on
  `/assessments` (title + vendor name, status dropdown, date range). Cross-vendor comparison
  page (`/vendors/compare?a=&b=`) rendering two different vendors' latest assessments
  side-by-side against the same framework — a common procurement use case.
- **Phase 22 — Polish & ops.** Template version history tree on the template detail page;
  audit log retention setting with cron-based pruning; database backup script
  (`scripts/backup.sh`); empty-states audit across dashboard, findings panel, comparison
  page, templates list, and vendor heatmap.
- **Phase 23 — NIST CSF 2.0 + Essential Eight.** Seed the NIST Cybersecurity Framework
  2.0 (129 subcategories across 6 functions: Govern, Identify, Protect, Detect, Respond,
  Recover) and the ASD Essential Eight Maturity Model (55 controls across 8 mitigation
  strategies with maturity levels 1–3). Richer starter templates for each framework with
  pre‑mapped controls. Idempotent seed — no schema changes; frameworks appear in browse UI,
  framework heatmaps, and template builder control mappings automatically. Also adds a
  framework filter dropdown to the control multi‑select in the question builder, so users
  can narrow the 328 controls to a single framework for easier selection.
- **Phase 24 — Visual branding.** Custom logo upload via Settings → Appearance (PNG/JPG,
  max 2 MB, stored via the existing storage interface). Logo appears in the sidebar header,
  login page, and as the browser favicon. Appearance tab with colour pickers to override the
  `--primary` (buttons, links, active states) and `--secondary` (tags, pills, badges) CSS
  token colours with hex values. A server‑rendered `<style>` block injects custom tokens at
  `:root` level, auto‑computing appropriate foreground contrast. Settings persisted in
  DB‑backed `appearance` category.
- **Phase 25 — Portal branding + shadcn controls.** Add four new shadcn components
  (Checkbox, Select, Textarea, RadioGroup) using radix-ui primitives. The vendor portal
  now renders the custom logo when configured. All plain HTML inputs in the questionnaire
  are replaced with themed shadcn equivalents: radio buttons → `RadioGroup`/`RadioGroupItem`,
  checkboxes → `Checkbox`, combobox → `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`,
  textareas → `Textarea`. Consistent focus rings, disabled states, and accessible labels
  throughout.
- **Phase 26 — Vendor search, export, import + API.** Vendor list page gets a search bar
  (name/email) and tier filter dropdown. Export button on vendor detail downloads a JSON
  file with full vendor data + assessments. Import form on vendors page accepts a validated
  JSON file and creates a new vendor. Four API routes: `GET /api/v1/vendors` (list/search
  with `?query=` and `?tier=`), `GET /api/v1/vendors/[id]` (full vendor detail with
  assessments + domain breakdown), `GET /api/v1/vendors/[id]/export` (downloadable JSON),
  and `POST /api/v1/vendors/import` (create vendor from JSON body). All endpoints are
  session‑authenticated.
- **Phase 27 — Test coverage for Phases 19–26.** Expanded test suite from 49 to 65 tests
  across 19 files. New integration tests: vendor search/export (4), rate limiter unit tests
  (4), notification counts (2), appearance settings persistence (2), assessment search (3),
  template version chain (1). Framework integration test updated to verify NIST CSF (129)
  and Essential Eight (55) control counts.
- **Phase 28 — Dashboard enhancements + shadcn charts.** Dashboard redesigned from a flat
  vendor list into a proper risk analytics surface. Summary stats bar (vendors tracked,
  average score, open findings, needs attention). Donut chart showing portfolio health by
  RAG band. Horizontal bar chart for score distribution. Top 10 deficient controls showing
  per‑control vendor gap counts. Vendor list split into "needs attention" and "all vendors"
  sections with filter buttons (All / Overdue / Critical / High / Unassessed). New `recharts`
  dependency with `components/ui/chart.tsx` (shadcn chart primitives) and a
  `DashboardCharts` client component.
- **Phase 29 — API documentation (Swagger/OpenAPI).** Comprehensive OpenAPI 3.0 spec
  documenting all 8 API endpoints with request/response schemas, error codes, and examples.
  Served at `GET /api/docs` as JSON. Interactive Swagger UI at `/docs` (authenticated,
  full‑screen, CDN‑embedded Swagger UI with "Try it out" for citizen developers). Sidebar
  nav link added. No npm dependencies — Swagger UI loaded from CDN.
- **Phase 30 — API key authentication.** `ApiKey` model with bcrypt-hashed keys
  (`mrk_` prefix), expiry (30/90/180/365 days or permanent), IP allowlisting (CIDR
  support), and soft revoke. Settings → API tab with enable/disable master switch, key
  CRUD, and copy-once dialog. Unified `authenticateRequest()` in `lib/api-auth.ts` that
  tries session cookie first, falls back to Bearer token when `api.enabled` is true.
  All 8 API routes updated to use the new auth. Audit logging for key create/revoke/
  enable/delete. OpenAPI spec updated with `bearerAuth` scheme.
- **Phase 31 — Settings refinements.** Moved the "API docs" link from the sidebar into the
  Settings → API tab as a button. Extracted the audit log from the Users tab into its own
  "Audit" tab with a filtered table (action type dropdown, user dropdown, date range) and
  color‑coded action badges. Extended `listAuditLogs()` with server‑side filter support
  for activity, user, and date criteria.
- **Phase 32 — Audit hardening + Configuration tab.** 30 new audit action strings register
  across assessments, collaboration, vendors, templates, and settings domains. Audit calls
  added to 29 state-changing operations — every create/update/delete/publish/import action
  is now logged. New `GET /api/v1/audit` endpoint with JSON and CSV output (action filter,
  user filter, date range, pagination). New "Configuration" tab in Settings (after Scoring)
  surfacing audit log retention, reminder offsets, escalation days, default due days, file
  upload limits, and allowed extensions. Cron route refactored to use typed settings getter
  for audit retention. OpenAPI spec updated with `/v1/audit` endpoint.
- **Phase 33 — Security, error handling & test hardening.** Rate‑limit the login action
  (10 per minute per IP) and the API key auth path (30 per minute per key). Hash portal
  access tokens at rest with bcrypt so a database dump doesn't expose active vendor
  questionnaires. Wrap assessment submit + scoring in a single Prisma transaction so a
  scoring failure doesn't leave an orphaned SUBMITTED assessment. Add `error.tsx` to
  `(internal)` and `global-error.tsx` to the root layout for graceful error recovery. Add
  `loading.tsx` files to dashboard, assessments, vendors, templates, frameworks, framework
  detail, and vendor detail routes. Fix the OpenAPI spec server URL from `/api/v1` to
  `/api` (was producing double `/v1` prefix). Clean up STAGE‑GATES.md: fix Phase 17
  status mismatch, Phase 22 sign‑off mismatch, and remove duplicate Phase 32 entry. Fix
  PLAN.md Phase 27/31 documentation gaps. Add `lib/storage/`, `lib/openapi.json`,
  `emails/dynamic.tsx`, and `prisma/seed-data/types.ts` to AGENTS.md layout diagram.
  Add unit tests for `authenticateRequest()`, `generateApiKey()`, `verifyApiKey()`,
  `isIpAllowed()`, and `ipInCidr()`.
- **Phase 34 — DRY, consistency & design tokens.** Extract the duplicated `getField`
  helper from 5 action files into `lib/actions/helpers.ts`. Consolidate the duplicate
  `formatResponseValue` and CSV escape functions into shared utilities. Replace all
  remaining native `<select>` elements with shadcn `<Select>` in vendor-form,
  question-form, audit-form Filter button, and the assessments/vendors list tier
  dropdowns. Replace native `<textarea>` with shadcn `<Textarea>` in vendor-form and
  question-form. Replace native `<input type="checkbox">` with shadcn `<Checkbox>` in
  question-form conditional-logic section. Replace hardcoded hex colors in
  `dashboard-charts.tsx` with CSS‑variable‑backed values. Add dark‑mode variants for
  the dashboard RAG colors.
- **Phase 35 — Architecture hardening.** Convert `AssessmentQuestion.conditionalLogic`
  from a JSON blob to two explicit columns (`conditionQuestionId` and `conditionEquals`)
  with referential integrity via a Prisma migration. Add a `FindingControl` join table
  to replace the denormalized `controlCodes: String[]` on `Finding`. Batch the N+1
  `response.upsert` calls in `saveResponses` using `Promise.all`. Add `React.cache()`
  wrappers to `getOrganizationSettings`, `getAppearanceSettings`, and
  `getNotificationCounts` to deduplicate same‑request DB queries. Merge the overlapping
  `getDashboardMetrics` and `getPortfolioSummary` into a single query. Log audit
  failures visibly instead of silently swallowing them with `.catch(() => undefined)`.
- **Phase 36 — Polish & cleanup.** Add `README.md` with Docker Compose bootstrap
  instructions, env setup, first‑run flow, and links to `/docs`. Remove the dead
  `OVERDUE` status label from the schema. Add `FindingStatus` label map for the unused
  `ACCEPTED`/`REMEDIATED` states. Fix `FinalizeButton` pending text from `"…"` to
  `"Finalizing…"`. Add `<noscript>` fallback to the vendor portal. Add `aria-label`
  to the dashboard charts for screen readers. Add skip‑to‑content link in the
  root layout. Add `loading="lazy"` to evidence images. Update remaining inline
  `<form>` tags on the assessment detail and settings user management to use
  `useActionState` for proper pending/error states. Add `Skeleton` loading
  placeholders to the templates and vendors list pages.
- **Phase 37 — Email tracking.** Expand `NotificationLog` into a full email audit trail:
  `subject`, `status` (SENT/FAILED), `errorMessage`, `sentById` → User FK; make
  `assessmentId` optional for test emails. Log every send from `sendEmail()` and
  `sendTestEmail()` — invite, reminder, escalation, and test messages. New "Email
  Tracking" tab in Settings with filterable table (status, type, recipient, date range)
  and Retry button for failed sends. Sidebar notification badge includes failed emails
  (last 24h). Email log retention setting (default 14 days) with cron-based pruning.
  Cron dedup updated to check for existing SENT entries, allowing retry of FAILED ones.
- **Phase 38 — UI/UX polish & consistency.** Custom-themed scrollbar; gradient sidebar header
  using primary colour; animated count-up stat cards on dashboard; toast notification system
  (slide-in success/error/info) wired to all settings forms and actions; auth page hero with
  branded gradient background, blur orbs, and organization logo/name; 6 inline SVG empty-state
  illustrations; keyboard shortcuts modal (`?` to toggle, `g`+letter for nav); dashboard
  trend indicators on stat cards; GitHub-style calendar heatmap of assessment activity;
  collapsible sidebar navigation sections (Dashboard, Risk, Frameworks, Manage); portal
  questionnaire progress bar with answered count and expiry date; unified RAG colour system
  with `--rag-green/amber/red/unscored` CSS variables and Appearance setting colour pickers;
  sidebar logo enlarged; missing detail-route loading skeletons added; border-radius slider
  and page-width selector in Appearance settings.
- **Phase 39 — Bulk vendor onboarding.** CSV bulk import of multiple vendors at once with
  preview and row-level validation; new `ImportVendorsForm` component with file upload and
  parsed-row count display. Bulk assessment sending: select multiple vendors on a new
  `/vendors/bulk-send` page, pick a template, set due date and reviewer, optionally set a
  shared portal password, and send individual assessments to all selected vendors in
  parallel. Each vendor gets their own assessment token and invite email.
- **Phase 40 — Reviewer submission notification.** New `"submission"` email template
  type sent to the reviewer when a vendor submits their questionnaire. Template editable
  in Settings alongside invite/reminder/escalation. Email includes vendor name, assessment
  title, and a direct link to the assessment detail. Notification is best-effort.
- **Phase 41 — Additional question types.** Extended the `QuestionType` enum with three new
  answer types: URL (validated URL input, manually scored), EMAIL (validated email input,
  manually scored), and CHECKBOX (single acknowledgment checkbox, auto-scorable). All three
  integrate into the builder UI, portal questionnaire, autoscoring, and the review panel.
- **Phase 42 — Auto-logout.** Configurable inactivity timeout (default 30 minutes, 0 =
  disabled, minimum 5 when enabled). An `IdleTimer` client component tracks mouse,
  keyboard, click, scroll, and touch activity. After the configured timeout, a 60-second
  countdown modal warns the user; any interaction resets the timer. On expiry, the session
  is signed out. Set in Settings → Limits.
- **Phase 43 — Confirmation dialogs.** Reusable `ConfirmDialog` component wrapping shadcn
  `AlertDialog`. Wired into all 11 destructive actions: delete vendor, delete assessment,
  revoke portal link, delete template/section/question, disable user, reset password,
  revoke API key, delete API key, and remove logo. Each dialog describes the specific
  data loss and requires explicit confirmation before the action fires.
- **Phase 44 — Question type label clarification.** `MULTIPLE_CHOICE` relabeled to
  "Single choice (pick one)" and `MULTI_SELECT` to "Multi‑select (pick many)" to clearly
  distinguish single-select vs multi-select answer types.
- **Phase 45 — Audit & email pagination + export.** Configurable page size (10/25/50/100)
  with auto-refresh on change; default 10 rows. Export dropdown on audit tab with two options:
  "All results" (API download with active filters) and "Current page" (client-side CSV).
  CSV export also added to audit API.
- **Phase 46 — Portal save/resume UX.** Persistent "Your answers are saved automatically"
  banner in the vendor questionnaire header. Save status now shows "Saved at 14:35" instead
  of generic "All changes saved". Invite-password email template includes resume reassurance.
  Post-submission view shows a confirmation card: "Your responses have been submitted."

## 8. Out of scope (v1+)

External scanning/continuous monitoring, vendor marketplace, complex role hierarchies, and
heavy settings screens. These may be revisited after v1.

## 9. Shared foundations (build once, reuse everywhere)

Phase 0 deliberately establishes the reusable building blocks below so later phases **compose**
them rather than recreating styles, components, or logic. This is enforced by the Definition of
Done in `STAGE-GATES.md`.

| Asset | Location | Purpose |
|-------|----------|---------|
| Design tokens (CSS vars + Tailwind theme) | `app/globals.css` | Single source of truth for colour/spacing/radius/typography; no hardcoded values |
| UI primitives (shadcn) | `components/ui/` | Buttons, inputs, dialog, table, etc.; extended via `cva` + `cn`, never duplicated |
| Domain components | `components/` | Reusable composites: `PageHeader`, `DataTable`, `EmptyState`, `StatusBadge`, `RiskScoreBadge`, form-field wrappers |
| App shell | `app/(internal)/layout.tsx` + `components/` | One sidebar/topbar layout reused by every internal page |
| Utilities | `lib/utils.ts` | `cn()` class merge; date / number / percentage formatters |
| Prisma client | `lib/prisma.ts` | Single shared client instance |
| Data access | `lib/db/` | Reusable typed query/mutation helpers; no duplicated Prisma queries |
| Validation & types | `lib/schemas/` | Shared zod schemas; inferred types reused on client + server |
| Scoring | `lib/scoring.ts` | One scoring engine used by assessments, profile, and heatmap |
| Auth / RBAC | `lib/auth.ts` | Session + role guards reused across server actions / routes |
| Email | `lib/email/` | `mailer` + React Email templates; one send path |
| Storage | `lib/storage/` | Storage interface + local-disk implementation behind one API |
| Portal tokens | `lib/tokens.ts` | Generate / validate / expire / revoke vendor links |
| Env | `lib/env.ts` | zod-validated deployment env (bootstrap/secrets only), imported everywhere |
| Settings | `lib/settings/` | Typed, zod-validated, DB-backed operational config accessor (one read/write path) for the in-app Settings area |

**Rule:** before building anything, search for an existing token/component/util/schema and
reuse or extend it. If a thing is needed in two or more places, extract it.
