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
- **Phase 47 — Role management & access control (RBAC).** Replaced the fixed `UserRole` enum
  with DB-backed roles (`Role` model). Ships three system roles — **Admin** (all permissions,
  locked), **Reviewer** (write + review), and **Viewer** (read-only) — plus admin-created
  **custom roles** with any subset of a `resource:action` permission catalog
  (`lib/permissions.ts`). Permissions are enforced on every server action, API route, and page
  via `requirePermission`/`requireAnyPermission`, and the nav/UI is gated with `hasPermission`.
  New Roles tab in Settings with a permission checkbox matrix; Users and SSO auto-provision
  now reference DB roles. Design of record: `authstage.md`.
- **Phase 48 — Data lifecycle & storage cleanup.** Physical evidence files are now deleted
  when an assessment or vendor is deleted, and a new upload for a question replaces (deletes)
  the previous file. Replacing/removing the org logo deletes the old file. Deleting a template
  version re-links its child versions to the deleted version's parent so version history stays
  continuous. A new orphan-sweep step in the cron job removes storage files no longer
  referenced by any `Evidence` row or the current logo (older than a 1-hour safety window),
  which also cleans up files orphaned by past deletes. Storage gained a `list()` capability.
- **Phase 49 — Roles management UX.** Reworked the Settings → Roles tab from a stack of
  always-expanded editors into a scannable **master–detail** design that scales to many custom
  roles: a searchable role list with a per-role **permission summary** (coverage chips + count),
  and a right-hand **slide-over (`Sheet`) editor** that renders a single permission matrix with
  **group + master "select all"** toggles. Added **duplicate role** (creates a `(copy)` with a
  unique name) and kept delete/system-role/Admin-lock protections. Admin shows a read-only
  summary instead of a disabled grid.
- **Phase 50 — UX & user-management fixes.** Fixed the confirm-dialog delete button (was
  red-on-black/unreadable; now uses the shared destructive button style). Decoupled toast
  colours from the configurable RAG palette via dedicated `--success` tokens. Fixed the
  dashboard stat cards showing `0` (a `useCountUp` Strict-Mode bug) and made the vendor filter
  render a single coherent list. Added the ability to **delete a user** (guarded: can't delete
  yourself or the last admin); audit logs and past review decisions are preserved as "Deleted
  user" via nullable `SetNull` relations.
- **Phase 51 — Correctness fixes.** Fixed CHECKBOX auto-scoring (a stored `"false"` was
  truthy, so "expected unchecked" mis-scored); template JSON import now accepts all question
  types (URL/EMAIL/CHECKBOX were rejected); `getTemplateVersionChain` now shows the full
  lineage from any version (previously only descendants of the current node); removed the dead
  duplicate `getDashboardMetrics`; the portal auth cookie no longer outlives its token; and the
  portal password gate uses `router.refresh()` instead of a full page reload.
- **Phase 52 — Vendor & assessment list UX.** The vendors list is now a compact, scannable row
  view showing each vendor's RAG-coloured score, last-assessed date, tier, and assessment
  count, with sorting and pagination. The assessments list gained colour-coded status badges,
  an **Overdue** flag + quick filter, a RAG score column, sorting, and pagination. Added a
  two-dropdown vendor **compare** picker (real entry point). New reusable pieces: `Pagination`,
  `AutoSubmitSelect`, `AssessmentStatusBadge`, and `ragTextClass`/`isAssessmentOverdue` helpers.
  Data-access `listVendors`/`listAssessments` now return `{ …, totalCount }` with sort/page
  params. The public `/api/v1/vendors` response shape is unchanged.
- **Phase 53 — Review & findings workflow.** The assessment lifecycle now auto-transitions
  `SUBMITTED → UNDER_REVIEW` on the first review decision, and the old "Reopen" is split into
  **Send back to vendor** (`IN_PROGRESS`, re-enables the portal, extends the token, and emails
  the original recipient(s) via a new **clarification** template with a reviewer message) and
  **Reopen review** (`UNDER_REVIEW`). Findings are now reviewer-managed with a simplified
  **Open / Remediated / Risk-accepted** model (retired `ACCEPTED`), each recording a resolution
  note, resolver, and time; a rescore preserves reviewer-set finding status. The assessment
  page adds review progress + per-decision filter, per-finding status controls, and a
  RAG-coloured score. Assessments persist `portalRecipients` so send-back reaches whoever the
  invite went to (vendor contact or custom email).
- **Phase 54 — Template builder.** Sections and questions can be **reordered** (↑/↓), a template
  can be **previewed** as the vendor sees it (`/templates/[id]/preview`), and templates can be
  **duplicated** into an independent DRAFT copy. **Conditional logic** now supports **multiple
  rules** combined with **All (AND) / Any (OR)** and a full operator set (equals, not equals,
  contains, not contains, >, <, ≥, ≤, answered, not answered) — backward compatible with the
  legacy single-`equals` shape, no migration. Control detail pages now show a **reverse
  mapping** of which templates/questions cover each control. Builder question rows show a
  readable conditional summary.
- **Phase 55 — Account & shell.** Added a **forgot-password / reset flow** (`PasswordResetToken`
  model, `/forgot-password` and `/reset-password` pages, a new **reset** email template,
  rate-limited reset emails, single-use tokens with 1-hour expiry). A **self-service profile**
  page at `/profile` lets any authenticated user change their name, email, and password (with
  current-password verification; forces re-login on email change). The `?` shortcuts modal is
  now a full **command palette** (⌘K/⌃K too) with fuzzy search, permission-aware filtering,
  and keyboard navigation. **Breadcrumbs** are now shown on the 5 deepest-navigation pages.
  The audit-action list was synced with the full audit-label catalog.
- **Phase 56 — Portal polish.** The vendor questionnaire now asks to **confirm before
  submitting**, vendors can **delete uploaded evidence** (with best-effort file removal; a
  server action validates token access), a **token-expiry countdown** warns when the link
  expires within 24 hours, **reviewer internal comments** are now visible to the vendor (both
  in the editable view on clarification-requested questions and on the submitted summary), a
  banner explains when an assessment has been **reopened for more info**, file-type/size
  **upload hints** are shown, and conditional questions have **smooth CSS transitions** on
  show/hide. The portal submit button now uses `variant="secondary"` for dark-mode visibility.
- **Phase 57 — Mobile & accessibility.** Settings tabs scroll horizontally; dense UI rows wrap
  on narrow screens; controls with fixed widths go full-width on mobile; breadcrumbs truncate.
  Branded `not-found.tsx`; toasts gain `aria-live` + `role="alert"`; idle-timer gets
  `role="alertdialog"`; command palette has full ARIA + focus trap; auth layout skip-link;
  error page uses Next.js `reset()`; inline `<style>` moved to `globals.css`; all `<img>` have
  `width`/`height` for CLS prevention; empty-state SVGs are decorative; Firefox scrollbar
  styling; notification badge + org name are screen-reader friendly; `aria-live` on pagination;
  `<fieldset>` grouping in question form. The final milestone — the app is deployment-clean.
- **Phase 58 — Settings & auth enhancements.** A **Test SMTP** button sends a test email using
  the saved SMTP settings. Fixed the **SSO "Enabled" toggle** resetting after save (the Radix
  checkboxes are now controlled). **Email templates** moved from one long form to a **master–detail
  list + slide-over `Sheet` editor** (edit one template at a time, with **reset-to-default**),
  matching the Roles UX. The per-answer **"Reject" review decision was removed** — review is now
  **Approve** or **Request clarification** (a data migration normalises historical `REJECTED`
  rows). Added an **SSO-only login** option (`disableLocalAuth`) that hides the email/password
  form when at least one SSO provider is enabled, plus a **break-glass URL** (rotatable secret,
  stored as a bcrypt hash, shown once) that re-reveals local login for emergency access, with
  rate-limited verification.
- **Phase 59 — Reverse-proxy hardening.** Client IP resolution is now proxy-aware and
  spoof-resistant: a shared `lib/client-ip.ts` reads the client address `TRUSTED_PROXY_COUNT`
  hops from the right of `X-Forwarded-For` (or a configured `CLIENT_IP_HEADER`), replacing the
  spoofable left-most parsing used by the login, break-glass, portal, and API rate limiters and
  the API-key IP allowlist. Two infra env vars (`TRUSTED_PROXY_COUNT`, `CLIENT_IP_HEADER`) and a
  README "Running behind a reverse proxy" guide (Caddy, nginx, Zoraxy, Azure) document how to
  self-host behind any TLS-terminating proxy; `trustHost` was already enabled so auth cookies
  and callback URLs follow the forwarded host/proto.
- **Phase 60 — Profile UX & SSO-aware credentials.** The self-service **Profile** page was
  rebuilt with card sections ("Account details", "Password") and a wider layout so the fields
  are no longer cramped. Accounts provisioned via SSO (no local password) now get an
  SSO-appropriate profile: the password section is hidden, the email is read-only (managed by
  the identity provider), and only the display name is editable — and the "Forgot password?"
  flow silently issues no reset link for them (still generic to avoid account enumeration).
  Local and SSO-linked accounts with a real password keep full password management.
- **Phase 61 — Test database isolation.** Integration tests were running against whatever
  `DATABASE_URL` pointed at (typically the dev database) and **destructively reset real data** —
  the settings test wiped email/organization/appearance settings and the notifications test
  deleted the entire notification-log history. `vitest.setup.ts` now prefers `TEST_DATABASE_URL`
  and **refuses to run unless the target database looks like a test DB** (or `ALLOW_TESTS_ON_THIS_DB=1`).
  The destructive tests were hardened too: the settings test snapshots and restores the settings
  it touches, and the notifications test no longer wipes unrelated logs. Documented in README →
  Testing.
- **Phase 62 — Users tab rework.** The **Users** settings tab was rebuilt to match the Roles
  master–detail pattern: a searchable staff list with role/status/**SSO-or-Local** badges and an
  "Added" date, and a slide-over `Sheet` editor that consolidates role change, enable/disable,
  password reset, and delete (with the existing last-admin/self-delete guards). **Password reset
  is hidden for SSO-provisioned accounts** (IdP owns credentials, per Phase 60). Both the Users
  and Roles tabs are now wrapped in `Card`s so they share the same dark-mode "grey card" shading
  as every other settings tab. A `listStaffAccounts()` data-access view derives SSO/local status
  server-side without exposing password hashes.
- **Phase 63 — Map a whole framework to a question.** The control picker
  (`ControlMultiSelect`) gained a **per-framework "select all" tri-state** (with an "n / total"
  count) so a single question can be mapped to every control in a framework in one click —
  ideal for "are you ISO 27001 / NIST certified?" questions where a compliant answer (plus the
  uploaded certificate) should satisfy the entire framework. Selection covers the whole
  framework regardless of the text filter. No scoring/schema change — the existing per-control
  compliance engine already handles many-controls-per-question; selection logic is extracted to
  `lib/control-selection.ts` with unit tests.
- **Phase 64 — Full-access API keys.** API keys previously inherited the permissions of the
  role of the user who created them. They now grant **full access to every endpoint**
  (`ALL_PERMISSIONS`) and are **independent of the creating account** — a key keeps working even
  if that user is later disabled or deleted (`ApiKey.createdBy` is now nullable with
  `onDelete: SetNull`). Minting keys is still gated by `API_MANAGE` (Admin-only by default),
  which is the sole trust boundary for issuing keys. IP allowlisting, expiry, per-key rate
  limits, enable/disable, and one-time display are unchanged.
- **Phase 65 — Vendors list view toggle.** The vendors list now has a **Rows / Cards** display
  toggle so each user can choose how they browse. The choice persists per browser via a
  `vendors_view` cookie (read server-side, default **rows**), so the page stays a Server
  Component. The card view shows the same data as the rows (name, tier, email, RAG score,
  last-assessed date, assessment count) in a responsive grid. The toggle component
  (`components/view-toggle.tsx`) is generic and can be reused on other lists later.

- **Phase 66 — Cross-vendor risk register.** A new **Risk register** page (sidebar, Risk group)
  lists every finding across all vendors with status/severity/vendor filters, priority sorting,
  summary stat cards (open, critical open, remediated, risk-accepted), and pagination. Reviewers
  can update a finding's status inline (reusing the existing status form + `ASSESSMENTS_REVIEW`
  guard); viewers get a read-only view (`ASSESSMENTS_VIEW`). The vendor detail page gained a
  **Findings** card surfacing that vendor's findings. New data-access helpers (`listFindings`,
  `getFindingSummary`, `listVendorFindings`) reuse the existing `Finding` model — no schema
  change. First of the "TPRM feature parity" series informed by a review of UpGuard-style tools.

- **Phase 67 — Vendor profile enrichment.** Vendors gained four structured fields: a **risk
  owner** (an internal user; `onDelete: SetNull` so the vendor survives owner deletion), a
  **data sensitivity** classification (Public/Internal/Confidential/Restricted), a **service
  provided** description, and a **contract renewal date** (surfaced on the vendor detail with an
  "overdue" flag; feeds the later dashboard "upcoming renewals"). Added to the vendor form,
  detail Overview card, zod schema, and the REST vendor import/response schemas. Migration adds
  the columns/enum/FK.

- **Phase 68 — Certifications & key-date tracking + reminders.** A new `VendorCertification`
  model lets you record a vendor's attestations (SOC 2, ISO 27001, …) with issuer, issued date,
  **expiry date**, and notes. The vendor detail page has a **Certifications** card (slide-over
  add/edit, delete — `VENDORS_EDIT`) with a computed status badge (Valid / Expiring soon /
  Expired). The **cron** now sends **expiry reminders** to each vendor's **risk owner** at 30 and
  7 days before a certification expiry *or* a contract renewal date (Phase 67), deduped via the
  notification log (new `EXPIRY` type + editable `expiry` email template). This is the lightweight,
  self-hosted substitute for continuous monitoring — no external scanning.

- **Phase 69 — Vendor edit UX fix.** Saving a vendor edit now shows a **"Vendor updated." success
  toast** (the update action returns a success state instead of `undefined`), and creating a
  vendor shows a **"Vendor created."** toast on the destination page (via `?created=1` + a
  reusable `FlashToast`). The **new** and **edit** vendor pages gained **breadcrumbs**
  (Vendors → … → New/Edit) for back-navigation, matching the detail page.

- **Phase 70 — Vendor import/export parity.** The Phase 67 vendor fields now flow through
  import and export. The **CSV export** summary includes service, data sensitivity, contract
  renewal, and owner, plus a **Certifications** section (name/issuer/issued/expires/status). The
  **REST import** (`/api/v1/vendors/import`) accepts `serviceDescription`, `dataSensitivity`, and
  `contractRenewalDate` (matching the OpenAPI spec, which dropped the unsupported `ownerId`), and
  the **CSV import** recognises the same three optional columns (data sensitivity validated,
  renewal date validated). Owner is intentionally set in-app only.

- **Phase 71 — Dashboard graph pack.** The dashboard gained four program-oversight views:
  **Open findings by severity** (bar), **Risk by tier** (stacked green/amber/red/unscored per
  Critical→Low), **Assessment status** (bar incl. computed overdue), and an **Upcoming key dates**
  list (next 60 days: certification expiries, contract renewals, and recurring-assessment
  next-runs, each linking to the vendor with an "in N days / overdue" indicator). Backed by a
  pure `computeRiskByTier` helper, `assessmentStatusCounts` in `getDashboardData`, the existing
  `getFindingSummary`, and a new `listUpcomingKeyDates`. No schema/migration.

- **Phase 72 — Security hardening (critical).** Batch A of the security/UX review remediation.
  API-key authentication now resolves a single candidate by an indexed `keyPrefix` and runs one
  bcrypt compare (was O(n) bcrypt over every key — a DoS-amplification + timing oracle); keys are
  minted as `mrk_<prefix>.<secret>` and pre-existing keys are invalidated by migration (must be
  regenerated). `TRUSTED_PROXY_COUNT` now defaults to `0` (X-Forwarded-For ignored unless a proxy
  count is set, closing an IP-allowlist spoof). `CRON_SECRET` is compared with a constant-time
  helper (`lib/timing-safe.ts`) and is required in production (except during `next build`).
  Evidence file serving sends `X-Content-Type-Options: nosniff` and only renders an allowlist of
  MIME types inline (everything else downloads) — closing a stored-XSS vector against reviewers.
  Portal vendors can no longer delete evidence or add comments after submission (`isPortalEditable`
  now gates both). No new endpoints.

- **Phase 73 — Security hardening (Batch B).** Defense-in-depth follow-up to Phase 72. The
  in-memory rate limiter now lazily evicts expired windows and caps its tracked-key count
  (`lib/rate-limit.ts`) — safe for the single-instance Docker deployment; a shared store is only
  needed if horizontally scaled. The public portal page load is now IP rate-limited and returns
  the same generic "link not found" shell when exceeded (anti-enumeration). The NextAuth
  credentials `authorize` callback is IP rate-limited, closing the direct-callback bypass of the
  login form's existing limiter. Portal evidence uploads reject dangerous MIME types
  (`lib/upload-validation.ts`) on top of the extension check and Phase 72 `nosniff`. All REST v1
  handlers run through a shared wrapper (`lib/api-response.ts`) that returns a generic 500 (no
  internals) on unexpected errors. A new `middleware.ts` sets a nonce-based strict
  Content-Security-Policy (per-request nonce threaded into the root layout + next-themes) plus
  baseline security headers (`X-Frame-Options: DENY`, `Referrer-Policy`, `X-Content-Type-Options`,
  `Permissions-Policy`). No schema/migration.

- **Phase 74 — Production Server-Action feedback fix + prod e2e.** Root-caused a production-only
  bug (worked in `next dev`, failed in `next start`): when a Server Action calls `revalidatePath`
  for its own current route and returns a value consumed by `useActionState`, the returned state
  is dropped on the client in production builds — so success toasts never showed and modal
  dialogs (e.g. the role editor) didn't auto-close. Data always persisted correctly; only the
  ephemeral feedback was lost. Fix (approach B): (1) a **resilient module-level toast store**
  (`components/toast.tsx`) so queued toasts survive the layout re-render a refresh triggers; (2) a
  reusable `useActionFeedback` hook that shows the toast and does a guarded `router.refresh()` on
  success; (3) affected actions (`saveApiSettingsAction`, `createRoleAction`, `updateRoleAction`)
  no longer self-`revalidatePath` — the client refreshes after the result is applied. Also fixed
  the Phase 73 middleware to apply the nonce-CSP only to document GETs (it must not rewrite
  request headers on Server-Action POSTs). Playwright now targets the **production** build
  (`npm run start` with `CRON_SECRET` wired in; fresh server in CI) so prod-only regressions are
  caught. Remaining state-returning forms are migrated to `useActionFeedback` incrementally.

- **Phase 75 — Correctness (Batch C) + AGENTS.md.** Correctness fixes from the code review:
  the dashboard now honours the admin-configured RAG thresholds (`ragBand`/`computeRiskByTier`
  take thresholds; `getDashboardData` passes `getScoringSettings().ragThresholds`); bulk-send
  separates real send failures from best-effort email failures and logs each per vendor; the six
  template section/question builder actions now write an `UPDATE_TEMPLATE` audit entry with a
  `change` meta; the dead throwing `finalizeAction` was removed; role duplicate/delete catches log
  instead of swallowing; user creation distinguishes the unique-email case (Prisma `P2002`) from
  other errors; the delete-assessment audit is written before the delete. Performance: an
  `Assessment.dueDate` index (migration `20260704010000`) for overdue/reminder queries,
  DB-level pagination for `listFindings` (was fetch-all + in-memory slice), and a single batched
  control-code lookup in the scoring transaction (was N+1). Naming/magic-number cleanups in the
  touched files. AGENTS.md gained verification/e2e conventions, security & deployment invariants,
  and Windows tooling notes. Follow-up (tracked): migrate the remaining state-returning settings
  forms to `useActionFeedback`.

- **Phase 76 — UX/accessibility (Batch D).** Accessibility and design-token polish from the
  review: added accessible labels to the previously-unlabeled inputs (portal/assessment custom-email
  send field, the debounced `SearchInput`, the staff search); added `scope="col"` to the two
  vendor comparison tables and replaced the raw `amber-50` "changed row" highlight with a semantic
  `bg-accent` token; switched the activity `CalendarHeatmap` off the RAG palette onto the neutral
  `--primary` scale (RAG tokens are reserved for compliance signals); routed portal comment/expiry
  dates through `formatDate`; and added `loading.tsx` skeletons for risk-register, profile,
  vendors/new, vendors/compare, bulk-send, and templates/new. Custom modal overlays (idle-timer,
  keyboard-shortcuts) aligned to the shadcn `bg-black/50` scrim. Lower-value polish (shared
  ProgressBar extraction, `text-[10px]` tier, `type="button"` on non-form buttons) is noted as
  optional follow-up.

- **Phase 77 — Settings-tab forms migration (deferred Phase-74 follow-up, part 1).** Migrated the
  in-place settings save forms (organization, email + SMTP test, email templates, scoring, SSO +
  break-glass URL, scheduling, limits, appearance) to the `useActionFeedback` pattern: their
  actions no longer `revalidatePath` the current route (which drops the returned state in
  production), and the client shows the toast + guarded `router.refresh()`. Void/redirect actions
  (`toggle/deleteApiKey`, `retryEmailSend` — no `useActionState` toast) keep their revalidation.
  A new e2e asserts a settings save toast against the production build. Remaining: Phase 78
  (modal/master-detail managers: users, certifications) and Phase 79 (vendor edit, profile).

- **Phase 78 — Modal/master-detail forms migration (Phase-74 follow-up, part 2).** Migrated the
  Sheet-based create/edit flows: `NewUserForm` (`addUserAction`), the certifications editor
  (`saveCertificationAction`), and the API key creation banner (`createApiKeyAction`). Those actions
  no longer `revalidatePath` their own route; the client shows the toast + guarded `router.refresh()`
  (`useActionFeedback`), and the create-key banner reads the one-time key from the resolved action
  promise then refreshes the list. Void edit sub-actions (role change, disable, reset, delete, cert
  delete) keep their revalidation. A new e2e creates a user and asserts the modal auto-closes and
  the row appears against the production build. Remaining: Phase 79 (vendor edit, profile).

- **Phase 79 — Profile/vendor forms migration (Phase-74 follow-up, part 3, final).** Migrated the
  profile form (`updateProfileAction` no longer revalidates its own `/profile` route) and the shared
  vendor form to `useActionFeedback`; the vendor edit action already revalidated the *detail* route
  (not the edit route) so it was unaffected, but the shared form is now consistent. Also unified the
  Phase-73 credentials-callback login limiter under the configurable `loginRateLimitPerMin` (instead
  of a separate hardcoded 10) so both the login form and the direct-callback path honour the same
  admin-set throttle. New e2e assert profile-save and vendor-edit toasts against the production
  build; e2e `global-setup` raises `loginRateLimitPerMin` so the growing suite's many same-IP logins
  don't trip the limiter. This completes the deferred `useActionFeedback` rollout — every
  state-returning in-place form now shows its toast reliably in production.

## 8. Out of scope (v1+)

External scanning/continuous monitoring, vendor marketplace, and heavy settings screens. These
may be revisited after v1. (Flat, permission-based roles landed in Phase 47; deeply nested role
*hierarchies* remain out of scope.)

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
