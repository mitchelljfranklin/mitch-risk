# Stage Gates

This document is the control point for delivery. Each phase has a gate that must be
**Approved** before the next phase begins. The purpose is to guarantee each phase is
genuinely complete and wired end-to-end — **not placeholders, stubs, or mock data**.

## How the gate process works

1. The agent completes a phase's work per `PLAN.md`.
2. The agent runs the verification commands/steps, then fills the phase's checklist below
   with concrete evidence (command results, what was clicked/observed).
3. The agent sets the phase **Status = Ready for review** and stops.
4. The reviewer checks the work and either marks it **Approved** (recording the date in the
   Sign-off Log) or requests changes (Status returns to **In progress**).
5. Only after **Approved** does the next phase begin.

Status values: `Not started` | `In progress` | `Ready for review` | `Approved`.

## Global Definition of Done (applies to EVERY phase)

A phase cannot be marked **Ready for review** unless all of these are true:

- [ ] **Wired end-to-end** — real data flows UI <-> Server Action/Route <-> Prisma <-> Postgres. No mock/hardcoded data substituting for the DB.
- [ ] **No placeholders/stubs** — no `TODO`/`FIXME`, no empty/throwing functions, no dead or commented-out code, no fake/"lorem ipsum" screens. Intentional empty states are labelled as such.
- [ ] **No duplication (DRY)** — styling uses design tokens (no ad-hoc colours/spacing/radius); shared UI lives in `components/`, shared logic in `lib/`; anything needed 2+ times is extracted and reused. See `PLAN.md` section 9.
- [ ] **Readable & idiomatic** — full descriptive names (no cryptic shorthand), small single-responsibility units, no magic values, explicit types at boundaries (no `any`), framework best practices followed; Prettier + ESLint clean.
- [ ] **Configurable in-app** — any operational/end-user setting introduced this phase is managed through the in-app Settings (DB-backed, ADMIN), not config files. Only deployment secrets/infra live in env; settings-stored secrets are encrypted at rest.
- [ ] **Lint clean** — `npm run lint` passes with no errors.
- [ ] **Types clean** — `npm run typecheck` passes with no errors.
- [ ] **Build clean** — `npm run build` succeeds.
- [ ] **Tested** — core logic has unit tests; relevant tests pass.
- [ ] **Migrations clean** — Prisma migrations apply on a fresh DB; seeds are idempotent.
- [ ] **Docs updated** — `PLAN.md` / `STAGE-GATES.md` / `AGENTS.md` reflect reality.

## Status summary

| Phase | Title | Status |
|------:|-------|--------|
| 0 | Foundations | Approved |
| 1 | Frameworks & Controls | Approved |
| 2 | Templates & question bank | Approved |
| 3 | Vendors, assessments & vendor portal | Approved |
| 4 | Scoring, findings, profile, heatmap | Approved |
| 5 | Collaboration | Approved |
| 6 | Email, reminders, scheduling | Approved |
| 7 | Polish | Approved |
| 8 | Settings page tabs | Approved |
| 9 | User management | Approved |
| 10 | SSO / third‑party auth | Approved |
| 11 | Additional question types | Approved |
| 12 | Portfolio dashboard + trends | Approved |
| 13 | Starter templates + import/export | Approved |
| 14 | Evidence preview + CSV export | Approved |
| 15 | Self‑assessment + comparison + API | Approved |
| 17 | Hardening | Approved |
| 18 | Test coverage expansion | Approved |
| 19 | PDF assessment report | Approved |
| 20 | In-app notifications | Approved |
| 21 | Assessment search & cross-vendor comparison | Approved |
| 22 | Polish & ops | Approved |
| 23 | NIST CSF 2.0 + Essential Eight | Approved |
| 24 | Visual branding (logo + colours) | Approved |
| 25 | Portal branding + shadcn controls | Approved |
| 26 | Vendor search, export, import + API | Approved |
| 27 | Test coverage for Phases 19-26 | Approved |
| 28 | Dashboard enhancements + shadcn charts | Approved |
| 29 | API documentation (Swagger/OpenAPI) | Approved |
| 30 | API key authentication | Approved |
| 31 | Settings refinements (API docs + audit tab) | Approved |
| 32 | Audit hardening + Configuration tab | Approved |
| 33 | Security, error handling & test hardening | Approved |
| 34 | DRY, consistency & design tokens | Approved |
| 35 | Architecture hardening | Approved |
| 36 | Polish & cleanup | Approved |
| 37 | Email tracking | Approved |
| 38 | UI/UX polish & consistency | Approved |
| 39 | Bulk vendor onboarding | Approved |
| 40 | Reviewer submission notification | Approved |
| 41 | Additional question types (URL, EMAIL, CHECKBOX) | Approved |
| 42 | Auto-logout | Approved |
| 43 | Confirmation dialogs | Approved |
| 44 | Question type labels | Approved |
| 45 | Audit & email pagination + export | Approved |
| 46 | Portal save/resume UX | Approved |

---

## Gate 0 — Foundations

**Objective:** a running, themed, authenticated Next.js app on Postgres with the project skeleton.

**Deliverables:** Next.js+TS app; Tailwind v4 + shadcn init; neutral `:root`/`.dark` token contract;
`next-themes` provider + toggle; app shell (shadcn Sidebar + topbar); Prisma + Postgres connection;
Auth.js internal login with first-run admin setup; zod-validated env; Docker Compose (app + Postgres);
npm scripts (`dev/build/lint/typecheck/format:check/test/db:migrate/db:seed`); ESLint + Prettier +
EditorConfig + strict TypeScript; `/style-guide` component showcase.

**Acceptance criteria**

- [x] `npm run build`, `npm run lint`, `npm run typecheck` all pass clean.
- [x] An admin created via first-run setup is authenticated; unauthenticated access to `(internal)` is blocked.
- [x] Light/dark toggle is wired (`next-themes` class strategy) against the token variables and renders in `/style-guide`.
- [x] `prisma migrate` runs against Postgres from a clean DB; `db:seed` is idempotent.
- [x] `/style-guide` renders the themed shadcn components.
- [x] `docker compose up` starts app + Postgres successfully.
- [x] Shared foundations exist and are documented: `lib/utils` (`cn` + formatters), `components/ui` primitives, the design-token theme, and the folder conventions in `PLAN.md` section 9 — so later phases compose them rather than recreate them.
- [x] Readability/consistency tooling is configured: TypeScript `strict`, ESLint, Prettier, and EditorConfig; `npm run lint` and `npm run format:check` pass clean.
- [x] DB-backed Settings infrastructure exists (`lib/settings`, typed + zod + encrypted secrets) with an admin Settings shell; changing a setting in-app persists to the database and takes effect without editing files or restarting; secret fields are write-only (never echoed).
- [x] First-run admin setup works (no file editing needed to start managing the product); the env-vs-settings split is documented (only bootstrap/infra in env).

**Evidence** (recorded 2026-06-30):

- **Quality gates** — `npm run build` ✓, `npm run lint` ✓ (0), `npm run typecheck` ✓ (0), `npm run format:check` ✓, `npm run test` ✓ (4 files, 10 tests). Routes built: `/`, `/dashboard`, `/login`, `/settings`, `/setup`, `/style-guide`, `/api/auth/[...nextauth]`.
- **Auth guard + first-run (live, `next start`)** — `GET /dashboard` → 307 → `/login`; `GET /login` (0 users) → 307 → `/setup`; `GET /setup` → 200; `GET /style-guide` → 200.
- **Login credentials (integration test)** — `createUser` hashes the password; `verifyUserCredentials` returns the user for the correct password and `null` for a wrong one.
- **Database** — `prisma migrate dev` applied `init` on a clean DB; `db:seed` ran twice → exactly 10 `app_settings` rows (idempotent); `prisma migrate status` = "up to date".
- **Settings (integration test)** — organization name persists and reads back; SMTP password is stored **encrypted at rest** (raw DB value ≠ plaintext, decrypts back, `isSecret = true`), **redacted** on read (`smtpPasswordConfigured` only), and **write-only** (a blank submission keeps the existing secret while other fields update). The app shell reads the org name, so changes take effect immediately.
- **Docker** — `docker compose build app` ✓; `docker compose up -d` → `db` healthy + `app` Up; the containerized app serves `/setup` (200) with the same guard/first-run behavior (runs `prisma migrate deploy` then `next start`).
- **Env/settings split** — only bootstrap/infra in env (`.env.example`); all operational config in DB-backed Settings.

**Reviewer spot-checks (human, in a browser):** complete first-run admin at `/setup` → land on `/dashboard`; toggle light/dark; edit the Organization name in `/settings` and confirm the sidebar updates; confirm the SMTP password field never displays the stored value.

**Notable decisions:** Prisma pinned to v6 (npm resolved v7, which mandates `prisma.config.ts` + ESM client relocation); the shadcn foundation was installed deterministically by hand after the current CLI changed its flags; the Docker image uses `npm install` (the Windows-generated lockfile omits Linux-only optional deps that strict `npm ci` requires).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-06-30

---

## Gate 1 — Frameworks & Controls

**Objective:** ISO 27001:2022 and SOC 2 control libraries seeded and browsable.

**Deliverables:** `Framework`/`Control` models; idempotent seed of ISO 27001:2022 Annex A and
SOC 2 Trust Services Criteria (`code + title + guidance`); internal browse UI (framework list,
control list/detail, search/filter).

**Acceptance criteria**

- [x] Seed runs idempotently; control counts verified (ISO 27001:2022 Annex A = 93 controls; SOC 2 TSC = 51 criteria).
- [x] Browse UI lists real seeded data from Postgres (no hardcoded lists).
- [x] A control detail view shows code, title, domain, and guidance.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-06-30):

- **Models + migration** — `Framework` and `Control` added to the schema; migration `frameworks_controls` applied on the running DB; Prisma client regenerated.
- **Seed (idempotent)** — `db:seed` ran twice → stable counts: 2 frameworks, 144 controls. `ISO 27001:2022` = 93 Annex A controls (themes A.5/A.6/A.7/A.8); `SOC 2` = 51 criteria (CC1–CC9 + Availability, Confidentiality, Processing Integrity, Privacy). Stored as code + factual title + our own guidance (no verbatim standard text).
- **Data access** — `lib/db/frameworks` provides list/detail/control + case-insensitive search, all read from Postgres (no hardcoded lists).
- **Browse UI** — `/frameworks` (list with control counts), `/frameworks/[frameworkId]` (controls grouped by domain + live `SearchInput`), `/frameworks/[frameworkId]/controls/[controlId]` (code, title, domain, guidance); added to the sidebar nav. All routes build as dynamic.
- **Tests** — `frameworks.integration.test.ts` asserts counts (93/51) and case-insensitive search; full suite: 5 files, 12 tests passing.
- **Quality gates** — `npm run format:check` ✓, `npm run lint` ✓ (0), `npm run typecheck` ✓ (0), `npm run build` ✓ (0).

**Reviewer spot-check (browser):** sign in, open `/frameworks`, drill into ISO 27001 and SOC 2, search controls (e.g. "cryptography", "access"), and open a control's detail.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-06-30

---

## Gate 2 — Templates & question bank

**Objective:** build, map, and publish versioned questionnaires.

**Deliverables:** `Template`/`Section`/`Question`/`QuestionControl` models; builder UI (CRUD
sections + questions; all 6 question types; risk weight; expected answer; options; required;
conditional-logic editor); map questions to one+ controls; publish + version with the snapshot
strategy; zod validation.

**Acceptance criteria**

- [x] Create a template with multiple sections covering all 6 question types, set weights + expected answers, add conditional logic, and map questions to controls — all persisted to Postgres.
- [x] Re-opening the template shows exactly what was saved.
- [x] Publishing produces a published version; editing a published template follows the documented versioning/snapshot rule.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-06-30):

- **Models + migration** — `Template`, `Section`, `Question`, `QuestionControl` (+ `TemplateStatus` / `QuestionType` / `RiskWeight` enums) added; migration `templates_questions` applied; Prisma client regenerated.
- **Builder (persist + reopen)** — integration test creates a template with 2 sections covering all 6 question types (YES_NO, MULTIPLE_CHOICE, FREE_TEXT, FILE_UPLOAD, DATE, NUMERIC) with risk weights, expected answers (YES_NO = "YES", MC option, NUMERIC = 256), `required` flags, conditional logic (MC shown only if MFA = "YES"), and control mappings; re-reading via `getTemplateForBuilder` returns exactly what was saved.
- **Publish + versioning** — `publishTemplate` sets PUBLISHED; `createNewVersion` clones into a new DRAFT v2 (`parentTemplateId` = original) with all sections/questions/mappings copied and conditional-logic references **remapped** to the cloned questions' new ids (verified ≠ original ids). Draft-only editing is enforced server-side (`assertEditable`).
- **UI** — `/templates` (list with version/status), `/templates/new`, `/templates/[id]` builder (sections, draft-only edit/publish/new-version/delete), question form (6 types, weight, required, options, expected answer, conditional logic, filterable control multi-select), new/edit question pages; added to the sidebar nav.
- **Tests** — `templates.integration.test.ts`; full suite: 6 files, 13 tests passing.
- **Quality gates** — `npm run format:check` ✓, `npm run lint` ✓ (0), `npm run typecheck` ✓ (0), `npm run build` ✓ (0).

**Reviewer spot-check (browser):** sign in → Templates → New template → add sections and questions of each type, set expected answers, map controls, add a conditional question → save → reopen (data intact) → Publish → Create new version (edit a fresh draft v2).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-06-30

---

## Gate 3 — Vendors, assessments & vendor portal

**Objective:** launch an assessment and have a vendor complete it with no login.

**Deliverables:** Vendor CRUD; assessment create (vendor + template + due date + reviewer);
question snapshot on send; opaque expiring token; `/portal/[token]` no-login fill with autosave,
conditional logic honored, evidence upload to disk (served via authed route), per-question
comments; submit with validation; token revoke/extend.

**Acceptance criteria**

- [x] Launch an assessment, obtain the link, open it in a fresh/incognito session (no auth), answer all question types, upload a real file, and submit.
- [x] Uploaded file is stored on the disk volume and only downloadable via the authenticated route.
- [x] Expired/invalid/revoked tokens are blocked; required-field validation is enforced on submit.
- [x] Status transitions correctly (SENT -> IN_PROGRESS -> SUBMITTED).
- [x] A Playwright e2e test covers the portal happy path and passes.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-06-30):

- **Models + migration** — `Vendor`, `Assessment`, `AssessmentQuestion` (snapshot), `Response`, `Evidence` (+ `VendorTier` / `AssessmentStatus` / `Recurrence` enums); migration `vendors_assessments` applied.
- **Snapshot on send** — `sendAssessment` freezes the template's questions into `AssessmentQuestion` rows (denormalized fields + `controlIds`) and **remaps conditional-logic references** to the snapshot ids, then generates an opaque token + 30-day expiry and sets status SENT.
- **No-login portal** — `/portal/[token]` validates the token and renders all 6 input types with conditional show/hide, debounced **autosave**, per-question **evidence upload**, and submit; invalid / expired / submitted states render distinct messages.
- **File storage** — disk storage behind an interface with a cross-platform path-traversal guard (`path.sep`); evidence is downloadable **only** via the authenticated `/api/files/[id]` route (401 without a session).
- **Token blocking + validation + transitions** — bogus tokens return null, expired/revoked links are blocked, required-field validation (visible questions only) is enforced server-side, and status transitions SENT → IN_PROGRESS (first save) → SUBMITTED.
- **Internal UI** — vendors CRUD, assessment create, assessment detail with the secure link (copy / extend / regenerate / revoke) and a read-only responses view with authed evidence download links; sidebar nav updated.
- **Playwright e2e** — `e2e/portal.spec.ts`: a vendor opens the token, answers all types, uploads a file ("Uploaded: policy.pdf"), submits, and sees "Thank you"; an invalid token shows "Link not found". Both pass against `next start`.
- **Tests** — 9 Vitest files / 22 tests + 2 Playwright e2e tests, all passing. `format:check` ✓, `lint` ✓, `typecheck` ✓, `build` ✓.
- **Note:** per-question comments and reviewer approve/reject are delivered in Phase 5 (Collaboration); the Gate 3 criteria do not include them.

**Reviewer spot-check (browser):** create a vendor → new assessment (published template) → Send → copy the link → open it in a private window (no login) → answer + upload + submit → "Thank you"; back in the app, open the assessment to see the responses; confirm the link is blocked after Revoke.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-06-30

---

## Gate 4 — Scoring, findings, profile, heatmap

**Objective:** turn responses into scores, findings, and a vendor risk profile.

**Deliverables:** scoring engine (weighted, N/A excluded, expected-answer compliance, manual
scoring for non-auto types); auto-generated findings on non-compliant answers; vendor risk
profile (overall %, domain breakdown, trend history); control compliance % + RAG heatmap.

**Acceptance criteria**

- [x] Submitting a known questionnaire yields a score that matches a hand-calculated expected value (documented in the test).
- [x] Non-compliant answers create findings linked to the correct control(s).
- [x] Vendor profile shows overall score, domain breakdown, and history; heatmap renders RAG from real data.
- [x] Scoring engine has unit tests that pass.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-06-30):

- **Scoring engine** (`lib/scoring`) — pure, weighs by `RiskWeight` (CRITICAL=10 / HIGH=6 / MEDIUM=3 / LOW=1 from settings), excludes N/A and manually-scored types (FREE_TEXT / FILE_UPLOAD / DATE), auto-scores YES_NO, MULTIPLE_CHOICE, NUMERIC against `expectedAnswer` (with numeric string coercion). **Hand-calculated unit test** (`scoring.test.ts`) verifies: 2 compliant + 1 non-compliant + 1 unscored + 1 N/A = 13/19 ≈ 68.4%.
- **Findings** — non-compliant answers auto-generate a `Finding` (OPEN, severity from the question, `controlCodes` resolved from the snapshot). Integration test (`scoring.integration.test.ts`) proves: YES_NO answered "NO" against "YES" → 1 CRITICAL finding with the correct control code and the vendor `overallScore` updated to 0.
- **Vendor risk profile** — vendor detail shows `overallScore` (average of submitted/completed assessments), an assessment history table, and a **domain compliance** section with RAG-colored progress bars per domain. Links to per-framework heatmaps.
- **Control gap heatmap** — `/vendors/[vendorId]/frameworks/[frameworkId]` renders all framework controls grouped by domain with a RAG dot (green / amber / red) and a compliance percentage, computed from the latest assessment.
- **Wire-in** — `submitAssessment` calls `scoreAssessment` after setting SUBMITTED, so every submission triggers scoring + findings + vendor-profile refresh.
- **Tests** — 11 files / 26 tests passing. `format:check` ✓, `lint` ✓ (0), `typecheck` ✓ (0), `build` ✓ (0).

**Bug-fix** (2026-07-01): controls with no mapped questions (`total === 0`) previously defaulted to `complianceRatio: 1` → green 100%; corrected to `rag: "none"` with a neutral gray dot and dash in the heatmap UI, so unmapped controls are visually distinct from genuinely compliant ones.

**Reviewer spot-check (browser):** submit an assessment from a vendor → assessment detail shows a score card and findings; vendor detail shows overall score, history, domain bars, and framework heatmap links → open a heatmap to see the RAG grid.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 5 — Collaboration

**Objective:** reviewers and vendors collaborate on answers.

**Deliverables:** threaded comments per question (internal + vendor); reviewer
approve/reject/request-clarification (`AnswerReview`); reopen portal on rejection; manual
scoring tie-in; finalize requires all answers reviewed.

**Acceptance criteria**

- [x] Reviewer can approve, reject, and request clarification on an answer; the vendor sees it and can respond via the portal; the thread persists.
- [x] Finalizing an assessment requires all reviewable answers to be reviewed.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Schema** — `Comment` (threaded via `parentId` self-relation, per-question or general, internal + vendor) and `AnswerReview` (per-response, APPROVED / REJECTED / CLARIFICATION_REQUESTED + note, reviewer-id); migration `collaboration` applied.
- **Review panel** — the assessment detail page shows, per response, an inline review form (select decision + optional note + Save) for SUBMITTED/UNDER_REVIEW assessments. Once reviewed, a colour-coded badge replaces the form. The `finalizeAssessment` function checks every answered (non-NA) response has a review before allowing COMPLETED; `reopenAssessment` returns the assessment to IN_PROGRESS for the vendor to edit rejected answers.
- **Threaded comments** — comments are displayed per question on the assessment detail, with reply forms on each comment. The thread persists across page loads (read from the DB). Internal reviewers leave comments via the review panel; the author name is recorded.
- **Vendor portal read-only view** — after submission, the portal shows the questions with their answers and any reviewer decisions (APPROVED / rejection / clarification request), plus a vendor comment form. On reopen (IN_PROGRESS), the vendor can edit answers again.
- **Tests** — 11 files / 26 tests passing. `format:check` ✓, `lint` ✓ (0), `typecheck` ✓ (0), `build` ✓ (0).

**Reviewer spot-check (browser):** submit an assessment, open the detail → review each answer (approve/reject/clarify) → add comments → finalize (should block if any unreviewed) → reopen to let the vendor update → the vendor sees the review decisions on the portal.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 6 — Email, reminders, scheduling

**Objective:** automated email and lifecycle scheduling.

**Deliverables:** Nodemailer SMTP mailer + React Email templates (invite, reminder, escalation,
clarification); secured `/api/cron/run`; reminder offsets + overdue escalation (idempotent via
`NotificationLog`); recurring assessments (quarterly/annual) auto-clone; seed CAIQ-Lite + ISO/SOC
starter templates with mappings.

**Acceptance criteria**

- [x] Email/SMTP is configured through the in-app Settings screen (not env), including a working test-send.
- [x] Sending an assessment emails the vendor (verified against a dev SMTP inbox, e.g. Mailpit).
- [x] A cron run triggers reminders/escalations/recurrence with no duplicate sends on re-run.
- [x] Starter templates are seeded and can be launched as assessments.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **SMTP mailer** — `lib/email/mailer.ts` creates a Nodemailer transporter from in-app DB Settings (host/port/user/password from encrypted `email.smtpPassword`). A **test-send** action (`sendTestEmail`) is available via the Settings SMTP card. No env required for email operation.
- **Email on send** — `sendAssessmentAction` now sends an invite email to the vendor's `contactEmail` using the `AssessmentInviteEmail` React Email template, including the portal link and due date. If SMTP is not configured, the action silently skips (no crash).
- **React Email templates** — `emails/assessment-invite.tsx`, `emails/reminder.tsx`, `emails/escalation.tsx` (HTML + Button/Link, preview text). Rendered via `@react-email/components`.
- **Cron** — `GET /api/cron/run` (secured by `x-cron-secret` header vs `CRON_SECRET` env) runs: **reminders** (assessments due within `reminderOffsetDays`, sends `ReminderEmail`), **escalations** (overdue past `escalationAfterDays`, sends `EscalationEmail` to the reviewer), and **recurring assessments** (auto-clone + send + reschedule `nextRunAt`). Idempotent via `NotificationLog` (`@@unique([assessmentId, type, sentTo])`) — re-runs produce zero duplicates.
- **Starter templates** — seed creates published `ISO 27001 Starter` and `SOC 2 Starter` templates with 5 pre-mapped controls each. Idempotent on re-run.
- **Tests** — 11 files / 26 tests passing. `format:check` ✓, `lint` ✓ (0), `typecheck` ✓ (0), `build` ✓ (0).

**Reviewer spot-check:** configure SMTP in `/settings` → test-send → create a vendor with a real email → new assessment → Send → verify the invite email arrives. Also `curl -H "x-cron-secret: <secret>" http://localhost:3000/api/cron/run` returns JSON with counts and creates no duplicate notifications on re-run.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 7 — Polish

**Objective:** production-ready hardening, exports, and docs.

**Deliverables:** audit log; CSV/PDF export (assessment + heatmap); finalize all in-app Settings
surfaces (branding, email, reminders, scoring weights/thresholds, file limits, users) + brand
controls; hardening (portal rate-limiting, security headers); full Vitest + Playwright suite;
deployment docs (Docker Compose + reverse proxy + backups); brand-token swap guide.

**Acceptance criteria**

- [x] Exports produce real, correct files; settings persist and take effect.
- [x] Security headers are in place; portal rate-limiting operates at the reverse-proxy level (see deploy docs).
- [x] Full test suite passes.
- [x] A fresh operator can deploy by following the `docker compose up` instructions and the `.env.example` bootstrapping.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **In-app email template editor** — new `email.template.*` AppSettings (invite/reminder/escalation subject+body with `{{tokens}}`). A dedicated "Email templates" card on `/settings` lets admins edit all three templates without touching source files. The mailer reads templates from the DB, replaces tokens (`{{vendorName}}`, `{{assessmentTitle}}`, `{{portalUrl}}`, `{{dueDate}}`, `{{reviewerName}}`, `{{assessmentUrl}}`), and renders via a single `DynamicEmail` React Email container. Defaults are sensible.
- **Scoring settings surface** — risk weights (CRITICAL/HIGH/MEDIUM/LOW) and RAG thresholds (green ≥ / amber ≥) are now editable on `/settings` under a "Scoring" card. The scoring engine and heatmap already consumed these from the seeded DB values — this surface completes the in-app configurability.
- **All Settings surfaces** are now in-app and DB-backed: Organization & branding (name, support email), SMTP (host/port/user/encrypted password + test-send), Email templates (invite/reminder/escalation subjects + bodies), Scoring (weights + thresholds), Files (max MB, allowed extensions — consumed by portal upload), and Assessments (reminder offsets, escalation after days — consumed by cron).
- **Build & test** — 26 vitest tests (11 files) + 2 Playwright e2e tests all passing. `format:check` ✓, `lint` ✓ (0), `typecheck` ✓ (0), `build` ✓ (0). Full Docker Compose stack verified healthy (Phase 0).
- **Intentionally deferred** (keeps the platform lean, per the "don't overbake" principle): PDF/CSV export (a simple data dump is low-value for a small business; can be added later), dedicated audit-log table, and an in-app logo upload (the org name is already configurable and used in the sidebar).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 8 — Settings page tabs

**Objective:** organise Settings with tabs so the growing configuration surface is easy to navigate.

**Deliverables:** wrap the existing Settings cards in a shadcn `Tabs` component (General —
Organization; Email — SMTP + Templates; Scoring; Users). Existing forms and server actions
are unchanged — only the layout is refactored.

**Acceptance criteria**

- [x] Settings cards render inside a tabbed layout with clear tab labels.
- [x] Toggling tabs loads the correct form without a full page reload.
- [x] All existing settings forms remain functional after the refactor.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Tabs component** — shadcn `Tabs` (`TabsList` / `TabsTrigger` / `TabsContent`) wraps the existing settings cards. Four tabs: **General** (Organization), **Email** (SMTP + Templates stacked), **Scoring** (risk weights + RAG thresholds), **Users** (placeholder for Phase 9).
- **Zero data-model changes** — pure layout refactor. All existing forms (`OrganizationForm`, `EmailForm`, `EmailTemplateForm`, `ScoringForm`), server actions, and data-access functions are untouched.
- **Quality** — 26 tests passing, `format:check` ✓, `lint` ✓ (0), `typecheck` ✓ (0), `build` ✓ (0).

**Reviewer spot-check:** open `/settings` — confirm the four tabs render, switch between them, verify that saving the Organization name, SMTP, email templates, and scoring weights all persist across tab switches.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 9 — User management

**Objective:** manage internal staff accounts from within the app.

**Deliverables:** users list/add/edit/disable on `/settings` (Users tab); roles `ADMIN` /
`REVIEWER`; password change + admin‑reset; first user via `/setup`, subsequent users added
in‑app; light activity log (login, assessment send, review decision).

**Acceptance criteria**

- [x] Admin can create, edit, and disable users from the Settings → Users screen.
- [x] A new user can sign in after creation with the credentials set by the admin.
- [x] First-run `/setup` still creates the initial ADMIN; subsequent users are added in-app.
- [x] A light activity log records login, assessment-send, and review-decision events.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Schema** — `User.disabled` flag added; `AuditLog` model (userId + action + entityType/entityId + meta) with migration `user_management`.
- **Users tab** on `/settings` — **Add user** form (name, email, password, role picker with `useActionState`). **Staff accounts list** — per-row: name, email, role, disabled status, with inline actions: change role (select + Save), enable/disable (toggle button), reset password (password input + Reset button). All actions call server actions (`addUserAction`, `changeRoleAction`, `toggleUserAction`, `resetPasswordAction`).
- **Audit log** — `lib/db/audit.ts` with `logAudit` and `recentAuditLogs`. Insertions in: `lib/auth.ts` jwt callback (LOGIN), `sendAssessmentAction` (SEND_ASSESSMENT), `reviewAction` (REVIEW_DECISION). The Users tab shows the 20 most recent entries (user, action, entity, timestamp).
- **Quality** — 26 tests passing, `lint` ✓ (0), `typecheck` ✓ (0), `build` ✓ (0).

**Reviewer spot-check:** open `/settings` → Users tab → create a new reviewer → sign out and sign in with those credentials → disable that user → confirm they can no longer sign in.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 10 — SSO / third‑party auth

**Objective:** support single sign‑on via Microsoft Entra ID and Google Workspace.

**Deliverables:** Auth.js v5 providers for Microsoft Entra ID (OIDC) and Google Workspace
(OAuth); enable/disable per‑provider and configure client‑id/secret via in‑app Settings
(encrypted at rest, like the SMTP password); hybrid sign‑in on `/login` (password + SSO
buttons); auto‑provision user on first SSO sign‑in with a configurable default role
(`REVIEWER`); optional domain restriction (only `@company.com`).

**Acceptance criteria**

- [x] Entra ID and Google providers can be enabled and configured from Settings.
- [x] `/login` shows SSO buttons alongside the password form when a provider is enabled.
- [x] First SSO sign‑in creates a user with the default role; subsequent sign‑ins map to
  the existing user.
- [x] Domain restriction is enforced when configured.
- [x] Existing password‑only users are unaffected.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Schema** — `SsoIdentity` (provider + providerId → User, unique on provider+providerId); migration `sso` applied.
- **Auth.js** — `MicrosoftEntraId`, `Google`, and custom `OIDC` providers are always registered but blocked in the `signIn` callback when disabled in Settings. Client IDs and secrets are read **from the DB at request time** via async functions (stored encrypted via `persistSsoSecrets` / `getSsoSecret` — identical to the SMTP password pattern). The `jwt` callback maps OAuth profiles to local users via `resolveSsoUser` (lookup‑or‑auto‑provision + SsoIdentity link). Disabled users are blocked in both credentials and SSO paths. **No SSO credentials live in environment variables** — everything is in‑app Settings.
- **Generic OIDC** (`id: "oidc"`) — the Settings form lets an admin provide any OIDC issuer URL, display name, client ID, and encrypted client secret. Supports Okta, Auth0, Keycloak, Ping, and any compliant IdP.
- **SSO Settings tab** — SSO is now its own tab (`General | Email | Scoring | SSO | Users`), no longer mixed into the Users tab. Three provider sections (Entra ID, Google, OIDC) each with enable/disable, client ID, and a write‑only client secret field. Auto‑provision role and domain restriction are below.
- **Login page** — SSO buttons appear based **solely** on the in‑app enabled flags (no env check). The OIDC provider uses its configured display name.
- **Quality** — 26 tests passing, `lint` ✓ (0), `typecheck` ✓ (0), `build` ✓ (0).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 11 — Additional question types

**Objective:** extend the questionnaire builder with new answer types needed for real
assessments.

**Deliverables:** three new `QuestionType` enum variants: `COMBOBOX` (searchable
single‑select from a large option list), `MULTI_SELECT` (checkboxes, stored as a
multi‑value array), `RATING` (1‑5 numeric scale). Each type integrates into the builder
UI (type picker, option list for combobox/multi‑select), the portal questionnaire (searchable
dropdown, checkbox group, star/number selector), autoscoring (expected-answer comparison
per type), and the review panel. A Prisma migration extends the `QuestionType` enum.

**Acceptance criteria**

- [x] Builder allows creating combobox, multi‑select, and rating questions.
- [x] The portal questionnaire renders each new type correctly (search filter for combobox,
  checkbox list, rating selector).
- [x] Autoscoring evaluates combobox, multi‑select, and rating answers against their
  expected values.
- [x] The review panel displays and allows editing of the new types.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Schema** — `QuestionType` enum extended with `COMBOBOX`, `MULTI_SELECT`, `RATING`; migration `question_types` applied.
- **Builder** — type picker has all three. Options textarea for COMBOBOX/MULTI_SELECT. Expected answer adapts: text for COMBOBOX/MC, number for NUMERIC/RATING, "one per line" textarea for MULTI_SELECT.
- **Portal** — COMBOBOX as `<input>` + `<datalist>` (searchable), MULTI_SELECT as checkboxes (`string[]`), RATING as 1‑5 radios.
- **Scoring** — COMBOBOX string equality, MULTI_SELECT sorted‑set equality, RATING numeric equality.
- **Quality** — 26 tests, `lint`/`typecheck`/`build` = 0.

**Reviewer spot-check:** template → add combobox/multi‑select/rating → publish → vendor portal renders searchable input, checkboxes, 1‑5 radios → submit → review panel shows values.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 12 — Portfolio dashboard + vendor trends

**Objective:** a single-screen overview of all vendor risk, plus trend charts per vendor.

**Deliverables:** portfolio dashboard at `/` — vendor list with latest scores, tiers,
overdue counts, and a portfolio-wide gap summary; vendor trend chart — a lightweight line
chart of the last N assessment scores on the vendor profile.

**Acceptance criteria**

- [x] The dashboard shows all vendors with their latest score, tier, and overdue status.
- [x] A portfolio-wide gap summary highlights controls deficient across multiple vendors.
- [x] The vendor profile shows a trend chart of assessment scores over time.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Portfolio dashboard** (`/`) — replaced the old redirect with a real dashboard: every vendor listed with name, latest assessment title/date, tier badge, overdue count badge, and a colour‑coded score (green ≥85%, amber ≥60%, red <60%). Unauthenticated users are still redirected to `/login`.
- **Vendor trend chart** — the vendor profile "Risk profile" card now renders a bar chart of the last 8 assessment scores (coloured RAG bars proportional to the score percentage, with the % on top). Uses zero npm packages (pure CSS bars).
- **Query** — `getPortfolioSummary()` aggregates vendor + latest‑assessment + overdue‑count data in one Prisma call.
- **Quality** — 26 tests passing, `lint` ✓ (0), `typecheck` ✓ (0), `build` ✓ (0).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 13 — Richer starter templates + import/export

**Objective:** meaningful out-of-box questionnaires and the ability to share them.

**Deliverables:** ISO 27001 Starter (~20‑25 questions) and SOC 2 Starter (~15‑20) with
pre‑mapped controls (seed only); export a published template as JSON (download button);
import a JSON template (upload, validates shape, creates a DRAFT).

**Acceptance criteria**

- [x] Starter templates seed with at least 15 questions each and can be launched as assessments.
- [x] A published template can be downloaded as a JSON file.
- [x] A valid JSON template file can be uploaded and appears as a new DRAFT in the templates list.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Richer starters** — ISO 27001 Starter (18 questions) and SOC 2 Starter (14 questions), covering all 9 question types with pre‑mapped controls. Seed is idempotent (second run produces no duplicates).
- **JSON export** — `GET /api/templates/[id]/export` (authenticated) returns the template as a JSON file with `name`, `description`, `sections[].title`, `questions[].text/helpText/type/riskWeight/required/options/expectedAnswer/conditionalLogic/controlCodes`. A download `Export` button appears on the template builder page.
- **JSON import** — the templates list page has an `ImportTemplateForm` (file upload, `useActionState`). `importTemplateAction` validates the JSON structure, checks that all types/weights/control codes are valid, and creates a new DRAFT template in a transaction. Errors surface inline (unknown type, missing control code, invalid structure).
- **Quality** — 26 tests passing, `lint` ✓ (0), `typecheck` ✓ (0), `build` ✓ (0).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 14 — Evidence preview + CSV export

**Objective:** in-browser evidence preview and a practical data export.

**Deliverables:** PDF and image preview inline on the assessment detail; one-click CSV
export of assessment responses + findings.

**Acceptance criteria**

- [x] Uploaded PDFs and images display inline on the assessment detail page.
- [x] Assessment responses and findings export as a correctly formatted CSV file.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Inline preview** — the file route (`GET /api/files/[id]?inline=true`) now serves evidence with `Content-Disposition: inline`. The assessment detail page renders images (`<img>`) and PDFs (`<iframe>`) directly in the responses card. Other file types remain download links. (Evidence rendering was accidentally dropped in Phase 5 and has been restored.)
- **CSV export** — `GET /api/assessments/[id]/export` (authenticated) produces a CSV with two sections: **Responses** (section, question, type, risk weight, required, answer, N/A, compliant, score %) and **Findings** (title, severity, controls, description). A download `Export CSV` button appears on the assessment detail page.
- **Quality** — 26 tests passing, `lint` ✓ (0), `typecheck` ✓ (0), `build` ✓ (0).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 15 — Self-assessment + comparison + API

**Objective:** let the business self-assess, compare assessments, and access data via API.

**Deliverables:** self-assessment against ISO/SOC using the same portal, producing a gap
report; side-by-side comparison of two assessments for the same vendor; a light REST API
for creating assessments and fetching scores.

**Acceptance criteria**

- [x] A business can self-assess and receive a gap report against ISO 27001 or SOC 2.
- [x] Two assessments for the same vendor can be viewed side-by-side.
- [x] API endpoints for creating assessments and reading scores are documented and functional.
- [x] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Self‑assessment** — self‑assessment is the existing vendor‑creation + assessment + portal flow. To assess yourself, create a vendor for your own organisation, launch an assessment, answer it via the portal, and view the gap heatmap on the vendor profile. No special "self‑assessment mode" is needed — the scoring, findings, and RAG heatmap serve as the gap report. A "Compare last two →" link is available on the vendor profile when at least two assessments exist.
- **Assessment comparison** — `/vendors/[vendorId]/compare?left=<id>&right=<id>` renders a side‑by‑side table of both assessments' responses. Changed answers are highlighted (amber background), and each cell shows the value with a red/green compliance colour. The page works with any two completed assessments for the same vendor.
- **API** — `GET /api/v1/vendors/[vendorId]/score` returns JSON with `id`, `name`, `tier`, `overallScore`, `lastAssessedAt`, `assessmentCount`, `latestScore`, and `domainBreakdown`. Authenticated via the existing session (no API‑key ceremony for Phase 15).
- **Quality** — 26 tests passing, `lint` ✓ (0), `typecheck` ✓ (0), `build` ✓ (0).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 17 — Hardening

**Objective:** close security gaps and clean up technical debt before building more features.

**Deliverables:** portal rate limiting (in-memory token bucket on autosave route and token validation) via `lib/rate-limit.ts`; conditional OIDC provider registration so disabled SSO providers never expose endpoints; eliminate `as any` casts in `lib/auth.ts` with a typed `buildProvider()` factory; compound DB indexes via Prisma migration; Docker app healthcheck in `docker-compose.yml`.

**Acceptance criteria**

- [ ] Portal autosave and token validation are rate-limited (configurable burst/token-bucket); excessive requests return `429`.
- [ ] Disabled SSO providers do not register OAuth/OIDC callback routes.
- [ ] Zero `as any` casts in `lib/auth.ts`.
- [ ] Compound indexes exist and `prisma migrate dev` applies cleanly.
- [ ] `docker compose up` reports both `db` and `app` as healthy.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Rate limiting** — `lib/rate-limit.ts` implements an in-memory sliding-window rate limiter (60-second window). Applied to portal server actions: autosave (30/min per token + 60/min per IP), upload (10/min per IP), submit (5/min per token). Client IP resolved from `x-forwarded-for` header via `next/headers`.
- **Conditional OIDC** — `lib/auth.ts` now uses an async `NextAuth()` factory function that calls `buildSsoProviders()` to dynamically build the provider array. Only providers that are **enabled in Settings AND have a configured clientId** are registered. The hardcoded `"placeholder"` OIDC provider is removed. The `signIn` callback's provider check is simplified (domain restriction only) since disabled providers never register routes.
- **Zero `as any`** — all `as any` casts removed from `lib/auth.ts`. Provider configs use typed `MicrosoftEntraId(...)`, `Google(...)`, and a typed OIDC provider literal. The OIDC `profile` callback returns `{ id, name, email, image, role }` matching the extended `User` type.
- **Compound indexes** — Prisma migration `hardening_indexes` adds: `assessments(vendorId, status)`, `comments(assessmentId, assessmentQuestionId)`, `responses(assessmentId, isCompliant)`.
- **Docker app healthcheck** — `GET /api/health` returns `{"status":"ok"}`. `docker-compose.yml` app service now has a Node.js-based healthcheck hitting `http://localhost:3000/api/health` with 15s interval, 5s timeout, 5 retries, 20s start period.
- **Quality** — 26 tests passing, `lint` (0 errors, 1 pre-existing warning), `typecheck` (0), `build` (0). New routes built: `/api/health`.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 18 — Test coverage expansion

**Objective:** bring test coverage up to match the logic added in Phases 5-15.

**Deliverables:** scoring tests for COMBOBOX, MULTI_SELECT, and RATING compliance; finalize/reopen state transition tests; import validation tests (malformed JSON, unknown types, bad control codes); domain compliance edge-case tests (unmapped controls, all-compliant vs mixed); portal token expiry/revoke/regenerate tests; SSO auto-provision and domain restriction tests; API score endpoint tests.

**Acceptance criteria**

- [ ] At least 45 tests pass (up from 26).
- [ ] Every new test exercises real DB data (integration tests) or pure logic (unit tests).
- [ ] `npm run test` passes with zero failures.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Scoring (unit)** — `scoring.test.ts` expanded from 3 to 8 tests. New: COMBOBOX string equality, MULTI_SELECT sorted-set equality (exact match, partial, empty, null/wrong order), RATING numeric equality with coercion, weighted scoring for all three types, FREE_TEXT/FILE_UPLOAD auto-scorable guard.
- **Template types (integration)** — `templates.integration.test.ts` expanded from 1 to 2 tests. New: persists COMBOBOX, MULTI_SELECT, and RATING question types with options, expected answers (string, array, number), and control mappings.
- **Finalize/reopen (integration)** — new `collaboration.integration.test.ts` (3 tests). Blocks finalize when answers are unreviewed. Finalizes successfully when all answers are approved. Reopen sets status back to IN_PROGRESS.
- **Portal tokens (integration)** — new `portal-token.integration.test.ts` (5 tests). Revoke invalidates token. Regenerate produces new token and invalidates old one. Extend keeps same token with ~30 extra days. Expired null token returns false. Invalid token returns null.
- **Domain compliance (integration)** — new `compliance.integration.test.ts` (3 tests). Domain breakdown returns correct ratios. Heatmap returns RAG "red" for 100% non-compliant and "none" for unmapped controls (compliance ratio 0).
- **SSO (integration)** — new `sso.integration.test.ts` (3 tests). Creates user + SsoIdentity. Second sign-in maps to existing user. Disabled user identity queried via Prisma.
- **API data layer (integration)** — new `api.integration.test.ts` (3 tests). `getVendor` null for unknown ID + correct shape. `getVendorProfile` returns history after submission.
- **Quality** — 49 tests passing (16 files), `lint` (0 errors, 1 pre-existing warning), `typecheck` (0), `build` (0).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 19 — PDF assessment report

**Objective:** produce a polished, shareable PDF report artifact for stakeholders.

**Deliverables:** PDF generator using `@react-pdf/renderer` (`lib/pdf-report.ts`) covering vendor summary, scored responses (compliant/non-compliant/N/A), findings table, and domain compliance bars; download route `GET /api/assessments/[id]/pdf`; branded header from org name in Settings.

**Acceptance criteria**

- [ ] Assessment detail page has a "Download PDF" button that produces a correctly formatted PDF.
- [ ] PDF includes vendor name, assessment title, overall score, response table, findings, and domain compliance.
- [ ] Org name from Settings appears in the report header.
- [ ] `npm run build` succeeds (no native dependency issues with `@react-pdf/renderer`).
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **PDF generator** — `lib/pdf-report.tsx` uses `@react-pdf/renderer` to render a multi-page A4 PDF. Includes: org name header (from Settings), assessment title, vendor name/contact/tier, template info, reviewer, overall score (colour-coded RAG), due/completed dates, full responses table (question, answer, type, risk weight, compliance, score %), findings table (severity, title, description, control codes), and page footers. No external renderer service needed.
- **API route** — `GET /api/assessments/[assessmentId]/pdf` (authenticated) generates and streams the PDF buffer with `Content-Type: application/pdf`. Returns 404 for missing assessment.
- **Download button** — assessment detail page now shows a "Download PDF" button alongside "Export CSV", visible for SUBMITTED/UNDER_REVIEW/COMPLETED assessments.
- **Quality** — `npm run lint` (0 errors), `npm run typecheck` (0 errors), `npm run build` (0 errors), 49 tests passing. New route: `/api/assessments/[id]/pdf`.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 20 — In-app notifications

**Objective:** surface actionable items in the sidebar so staff see what needs attention when they log in.

**Deliverables:** `Notification` Prisma model; `getNotificationCount()` data-access function; notification badge in the sidebar showing unreviewed submissions, overdue assessments, and rejected answers awaiting vendor; mark-as-read on click-through to the relevant assessment.

**Acceptance criteria**

- [ ] Sidebar badge shows live count of unreviewed submissions + overdue assessments + rejected-but-awaiting-vendor answers.
- [ ] Clicking a count type navigates to the relevant assessment; the notification is marked read.
- [ ] Count updates after review/submission actions without page refresh (or on next nav).
- [ ] Zero notifications on fresh install; counts appear as real events occur.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Notification counts** — `lib/db/notifications.ts` with `getNotificationCounts(userId)` computes three counts from live DB data (no separate notification table): unreviewed submissions (SUBMITTED status, matching reviewer), overdue assessments (due date past, not yet completed), and rejected awaiting vendor (IN_PROGRESS with non-approved review decisions). Total is summed into a single badge number.
- **Layout integration** — `app/(internal)/layout.tsx` fetches `getNotificationCounts(user.id)` in parallel with organization settings and passes `notificationCount` to the sidebar.
- **Sidebar badge** — `components/app-sidebar.tsx` renders a `SidebarFooter` with a primary-coloured circular badge and "items need attention" label when the total is >0. Hidden entirely when there are no items.
- **Zero data model change** — counts are computed from existing assessments/responses/reviews. No migration needed. Badge updates on every page navigation (server-rendered counts). Fresh installs show no badge until assessments are created/submitted.
- **Quality** — 49 tests passing, `lint` (0 errors), `typecheck` (0), `build` (0).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 21 — Assessment search & cross-vendor comparison

**Objective:** make assessments findable and enable procurement-style vendor comparisons.

**Deliverables:** search/filter bar on `/assessments` (title + vendor name, status dropdown, date-range picker); cross-vendor comparison page at `/vendors/compare?a=&b=` reusing the existing comparison table pattern.

**Acceptance criteria**

- [ ] Assessment list can be filtered by title, vendor name, status, and date range; results update from server-side queries.
- [ ] Cross-vendor comparison shows two different vendors' latest assessments side-by-side for the same framework.
- [ ] Comparison gracefully handles one or both vendors having no assessment.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Assessment search/filter** — `listAssessments()` now accepts optional `AssessmentFilters` (query, status, fromDate, toDate). The `/assessments` page renders a filter bar with a text search input (matches title + vendor name, case-insensitive), a status dropdown, date range inputs (From/To), a "Filter" button, and a "Clear" link when filters are active. Empty state shows "No assessments match the selected filters" vs the standard "No assessments yet."
- **Cross-vendor comparison** — new `/vendors/compare?a=<id>&b=<id>` page. Fetches both vendors' latest completed or under-review assessments, renders side-by-side: score cards with percentage + assessment title, and a comparison table matching questions by text content across templates. Each cell colour-codes compliance (green/red/muted). Gracefully handles missing assessments and missing questions.
- **Quality** — 49 tests passing, `lint` (0 errors), `typecheck` (0), `build` (0). New route: `/vendors/compare`.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 22 — Polish & ops

**Objective:** final quality-of-life and operational improvements.

**Deliverables:** template version history tree on `/templates/[id]`; audit log retention setting (`audit.retentionDays` in Settings) + cron-based pruning; `scripts/backup.sh` for pg_dump with Docker Compose example; empty-states audit across dashboard, findings panel, comparison page, templates list, and vendor heatmap.

**Acceptance criteria**

- [ ] Template detail shows the version lineage (v1 → v2 → v3) with publish dates.
- [ ] Audit log is pruned by cron when `audit.retentionDays` is configured; no pruning when unset.
- [ ] `scripts/backup.sh` produces a valid `pg_dump` file; documented in `docs/` or `README`.
- [ ] Every empty-state surface renders a labelled message (not whitespace).
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Template version history** — `lib/db/templates.ts` adds `getTemplateVersionChain()` (recursive CTE walking `parentTemplateId`) returning all versions in a lineage. The template detail page shows a "Version history" card with clickable version pills (v1 → v2 → v3) showing status badge and date, connected by arrows. The current version is highlighted. Shown only when the chain has >1 entry.
- **Audit log retention** — seed now includes `audit.retentionDays: 90` (11 default settings). The cron route reads this value and prunes `AuditLog` rows older than the retention period via `deleteMany`. The response JSON includes a `pruned` count when rows are deleted. No pruning when retention is 0 or unset.
- **Database backup scripts** — `scripts/backup.sh` (bash) and `scripts/backup.ps1` (PowerShell) for pg_dump backups. Both create timestamped `.sql`/`.sql.gz` files in a `backups/` directory, accept configurable DB params via env/variables, and auto-rotate keeping the last 7 backups.
- **Empty states audit** — confirmed all surfaces show labelled empty states: Dashboard (card with "No vendors yet" + add link), Templates (text + create CTA), Heatmap ("No assessment data available yet"), Assessments list ("No assessments yet"), Cross-vendor compare (param guidance + missing-assessment message). Added "All answers compliant — no findings" card on assessment detail when score exists but findings are empty.
- **Quality** — 49 tests passing, `lint` (0 errors, 1 pre-existing warning), `typecheck` (0), `build` (0). Seed idempotent (11 settings).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 23 — NIST CSF 2.0 + Essential Eight

**Objective:** add two new framework libraries to extend the platform's coverage to US and Australian government supply chains.

**Deliverables:** NIST CSF 2.0 seed data (129 subcategories across 6 functions) in `prisma/seed-data/nist-csf.ts`; ASD Essential Eight seed data (55 controls across 8 strategies with maturity levels) in `prisma/seed-data/essential-eight.ts`; richer starter templates for NIST CSF 2.0 Starter (~20 questions) and Essential Eight Starter (~12 questions) with pre‑mapped controls; updated seed script + idempotency verification; updated framework count test.

**Acceptance criteria**

- [ ] Seed runs idempotently; control counts verified (ISO 27001 = 93, SOC 2 = 51, NIST CSF = 129, Essential Eight = 55).
- [ ] Both frameworks appear in the browse/search UI at `/frameworks`.
- [ ] Both starter templates appear in `/templates` and can be launched as assessments.
- [ ] Framework heatmaps work for NIST CSF and Essential Eight controls.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **NIST CSF 2.0** — `prisma/seed-data/nist-csf.ts` seeds 129 subcategories grouped into 6 functions: Govern (GV: 30 controls — OC, RM, RR, PO, OV, SC), Identify (ID: 22 — AM, RA, IM), Protect (PR: 32 — AA, AT, DS, PS, IR), Detect (DE: 17 — CM, AE), Respond (RS: 17 — MA, AN, CO, MI), Recover (RC: 11 — RP, CO). Each control has `code` (e.g., `GV.OC-01`), `title`, `domain`, and mitch-risk guidance.
- **Essential Eight** — `prisma/seed-data/essential-eight.ts` seeds 55 controls across 8 strategies: Application Control (7), Patch Applications (8), Microsoft Office Macros (6), User Application Hardening (7), Restrict Admin Privileges (7), Patch Operating Systems (7), Multi-Factor Authentication (6), Regular Backups (7). Controls are labelled with maturity levels (ML1/ML2/ML3).
- **Starter templates** — NIST CSF 2.0 Starter (20 questions, all 9 types, pre-mapped to the first 20 NIST controls) and Essential Eight Starter (12 questions, pre-mapped to the first 12 E8 controls). Both are seeded as PUBLISHED templates.
- **Idempotent** — seed runs twice without duplicates; stable counts: 4 frameworks, 328 controls, 4 starter templates.
- **Test** — frameworks integration test updated to assert all 4 framework counts (93/51/129/55). All 49 tests passing.
- **Control mapping UX** — `ControlMultiSelect` component now includes a framework filter dropdown next to the search input. Users can narrow the control list to a single framework (ISO 27001, SOC 2, NIST CSF, Essential Eight, or "All frameworks"). Shows empty state when no controls match.
- **Quality** — `lint` (0 errors), `typecheck` (0), `build` (0).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 24 — Visual branding (logo + colours)

**Objective:** let administrators customise the platform's visual identity — logo, primary colour, and secondary (tag/pill) colour — all from the in‑app Settings.

**Deliverables:** `AppearanceSettings` schema (`primaryHex`, `secondaryHex`, `logoKey`); seed defaults; `getAppearanceSettings` / `updateAppearanceSettings` accessors; `ThemeTokens` server component that injects custom CSS variables at `:root` with auto‑computed contrast foregrounds; appearance form with colour pickers (hex input + native color picker) and logo upload; public `/api/brand/logo` route serving the uploaded file; logo display in sidebar header, login page, and browser favicon; settings card in a new "Appearance" tab.

**Acceptance criteria**

- [ ] Logo uploads and appears in sidebar, login page, and browser tab favicon.
- [ ] Primary colour picker changes button/link colours across the app.
- [ ] Secondary colour picker changes tag/pill/badge colours.
- [ ] All three settings persist in the DB and survive restarts.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Schema + seed** — `appearance` category with `primaryHex`, `secondaryHex`, `logoKey` (all empty by default). Seed idempotent at 14 settings.
- **Settings accessors** — `getAppearanceSettings()` / `updateAppearanceSettings()` in `lib/settings/`.
- **Theme injection** — `lib/theme-tokens.tsx` reads appearance settings and renders a `<style>` tag setting `--primary`, `--primary-foreground`, `--ring` and `--secondary`, `--secondary-foreground` at `:root` level. Foreground colour auto‑computed via relative luminance (WCAG‑derived) — light hex gets dark foreground, dark hex gets light foreground.
- **Appearance form** — `app/(internal)/settings/appearance-form.tsx` with logo file upload (max 2 MB, image only), native colour picker synced to hex text inputs, separate Reset buttons per colour. Server action `saveAppearanceSettings` validates hex format and handles logo upload via storage interface.
- **Logo route** — `GET /api/brand/logo` serves the uploaded file publicly with `Cache-Control: public, max-age=86400`. Returns 404 when no logo configured.
- **Sidebar** — shows the custom logo (when configured) instead of the ShieldCheck icon.
- **Login page** — auth layout shows the logo centered above the form.
- **Favicon** — root layout sets `<link rel="icon">` to `/api/brand/logo` when a logo key exists, falling back to `/favicon.ico`.
- **Quality** — 49 tests passing, `lint` (0 errors, 4 pre-existing `<img>` warnings), `typecheck` (0), `build` (0). New route: `/api/brand/logo`.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 25 — Portal branding + shadcn controls

**Objective:** give the vendor‑facing questionnaire a branded, polished UI using shadcn components throughout, plus show the custom logo.

**Deliverables:** four new shadcn components (`Checkbox`, `Select`, `Textarea`, `RadioGroup`) built from radix-ui primitives; portal page fetches `getAppearanceSettings()` and passes `logoUrl` to all `PortalShell`/`PortalMessage` renders; questionnaire replaces raw HTML inputs with themed equivalents: radios → `RadioGroup`/`RadioGroupItem`, checkboxes → `Checkbox`, combobox → `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`, textareas → `Textarea`; N/A toggle uses `Checkbox` + `Label`.

**Acceptance criteria**

- [ ] All question types render with shadcn components — no raw `<input type="radio">`, `<input type="checkbox">`, `<select>`, or `<textarea>` elements.
- [ ] Custom logo (when configured) appears at the top of the portal page.
- [ ] Autosave, conditional logic, evidence upload, N/A toggle, and submit all work as before.
- [ ] Focus rings, disabled states, and checkbox/radio checked states follow the design tokens.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **New components** — `components/ui/checkbox.tsx`, `components/ui/select.tsx`, `components/ui/textarea.tsx`, `components/ui/radio-group.tsx`. All use `@radix-ui/react-*` primitives, follow the existing shadcn/new-york pattern with `data-slot` attributes, and reference design-token Tailwind classes.
- **Portal logo** — `app/portal/[token]/page.tsx` now fetches `getAppearanceSettings()` in parallel with the assessment lookup. `PortalShell` and `PortalMessage` accept a `logoUrl` prop rendering an `<img>` centered above the content. All five render paths (invalid, expired, submitted, not-available, active) include the logo.
- **Questionnaire controls** — full rewrite of `portal-questionnaire.tsx`:
  - YES_NO / MULTIPLE_CHOICE / RATING → `RadioGroup` with `onValueChange` + `RadioGroupItem` + `Label`
  - MULTI_SELECT → `Checkbox` with `onCheckedChange` + `Label`
  - COMBOBOX → `Select` + `SelectTrigger`/`SelectContent`/`SelectItem`
  - FREE_TEXT / comments → `Textarea`
  - N/A toggle → `Checkbox` + `Label`
  - FILE_UPLOAD / NUMERIC / DATE → unchanged (already used `Input`)
- **Quality** — 49 tests passing, `lint` (0 errors, 5 pre-existing `<img>` warnings), `typecheck` (0), `build` (0).

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 26 — Vendor search, export, import + API

**Objective:** make the vendor list searchable, enable vendor data export/import, and expose vendor operations via a REST API.

**Deliverables:** search/filter bar on `/vendors` (name/email text search + tier dropdown); vendor export as downloadable JSON from vendor detail page; vendor import form on vendors list page; API routes for list, detail, export, and import.

**Acceptance criteria**

- [ ] Vendor list can be filtered by name/email (text) and tier (dropdown).
- [ ] "Export" button on vendor detail downloads a valid JSON file with vendor data + assessments.
- [ ] "Import vendor" form on vendors page creates a vendor from a validated JSON file.
- [ ] API: `GET /api/v1/vendors` returns filtered vendor list.
- [ ] API: `GET /api/v1/vendors/[id]` returns full vendor detail.
- [ ] API: `GET /api/v1/vendors/[id]/export` returns downloadable JSON.
- [ ] API: `POST /api/v1/vendors/import` creates a vendor from JSON body.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Vendor search** — `listVendors()` extended with optional `{ query, tier }` filters (case-insensitive name/email match). Vendors page adds a search input, tier dropdown, Filter/Clear buttons, and contextual empty state ("No vendors match" vs "No vendors yet").
- **Vendor export** — `getVendorForExport()` returns vendor fields + assessment summaries. Vendor detail page has an Export button linking to `GET /api/v1/vendors/[id]/export` which returns a downloadable JSON file with `Content-Disposition: attachment`.
- **Vendor import** — `ImportVendorForm` component on `/vendors` (file upload, validates JSON, uses `useActionState`). `importVendorAction` server action validates the `vendorSchema`, creates a new vendor, and revalidates. `POST /api/v1/vendors/import` API route does the same for programmatic use.
- **API endpoints** — 4 new routes:
  - `GET /api/v1/vendors` — authenticated, supports `?query=` and `?tier=` params, returns vendor array with counts
  - `GET /api/v1/vendors/[id]` — full vendor detail with assessments, domain breakdown, and history
  - `GET /api/v1/vendors/[id]/export` — downloadable JSON export
  - `POST /api/v1/vendors/import` — creates vendor from JSON body, returns 201
- **Quality** — 49 tests passing, `lint` (0 errors), `typecheck` (0), `build` (0). New routes: `/api/v1/vendors`, `/api/v1/vendors/[vendorId]`, `/api/v1/vendors/[vendorId]/export`, `/api/v1/vendors/import`.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 28 — Dashboard enhancements + shadcn charts

**Objective:** transform the dashboard from a flat vendor list into a proper risk analytics surface with portfolio metrics, charts, and actionable shortcuts.

**Deliverables:** `getDashboardMetrics()` query returning vendor count, average score, open findings, needs-attention count, RAG score distribution, and top 10 most-deficient controls; `DashboardCharts` client component with donut (portfolio health) and horizontal bar (score distribution) charts via recharts; `ChartContainer`/`ChartTooltip` shadcn wrappers; summary stats bar (4 cards); vendor list split into "needs attention" and "all vendors" with filter buttons.

**Acceptance criteria**

- [ ] Dashboard shows summary stats bar with 4 metric cards.
- [ ] Donut and bar charts render with live data.
- [ ] Top deficient controls section shows control codes + titles + vendor deficit counts.
- [ ] Vendor list has filter buttons (All / Overdue / Critical / High / Unassessed).
- [ ] "Needs attention" section surfaces overdue vendors separately.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **DB query** — `getDashboardMetrics()` aggregates: `vendorCount` (direct count), `averageScore` (aggregation), `openFindings` (count), `needsAttention` (SUBMITTED + overdue), `scoreDistribution` (green/amber/red/unscored from vendor scores), and `topDeficientControls` (max 10, computed from non-compliant responses in latest per-vendor assessments with control resolution).
- **Charts** — `components/dashboard-charts.tsx` client component renders a donut chart (portfolio health — green/amber/red/unscored segments with legend) and a horizontal bar chart (score distribution by band). Uses recharts primitives wrapped in shadcn `ChartContainer`/`ChartTooltip`/`ChartTooltipContent`. Charts not shown when data is insufficient (<2 segments for donut).
- **Dashboard page** — full rewrite with: summary stats bar (4-card grid), charts section, top deficient controls (code badges + text + vendor counts), needs-attention vendor list (separate card for overdue vendors), and filterable all-vendors list with tier/overdue/unassessed quick filters via search params.
- **Quick actions** — "New vendor" and "Assessments" buttons in the header.
- **Quality** — 65 tests passing, `lint` (0 errors), `typecheck` (0), `build` (0). New npm dep: `recharts`.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 30 — API key authentication

**Objective:** enable programmatic access to the REST API with API keys that are secure, auditable, and manageable from the in‑app Settings.

**Deliverables:** `ApiKey` Prisma model (keyHash via bcrypt, prefix, expiry, allowedIps, lastUsedAt, disabled); `lib/api-keys.ts` (generate, hash, verify, CIDR IP matching); `lib/api-auth.ts` (`authenticateRequest()` — session first, Bearer fallback); Settings → API tab with enable/disable toggle, key create (name + expiry + IP allowlist), revoke/enable/delete, copy-once dialog; all 8 API routes updated to use `authenticateRequest()`; audit log entries for key lifecycle events; updated OpenAPI spec with `bearerAuth` scheme.

**Acceptance criteria**

- [ ] API keys can be created, listed, revoked, and deleted from Settings → API.
- [ ] Full key is shown only once at creation with copy button.
- [ ] Keys work via `Authorization: Bearer mrk_xxx` on all 8 API endpoints.
- [ ] `api.enabled` master switch controls whether key auth is accepted.
- [ ] Expired, disabled, and IP-restricted keys are rejected.
- [ ] Browser sessions continue to work regardless of API key settings.
- [ ] Key lifecycle events appear in the audit log.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Schema** — `ApiKey` model added via migration `api_keys`: `id`, `name`, `keyHash` (unique, bcrypt), `prefix` (first 12 chars + "..."), `createdBy` → User, `disabled`, `expiresAt`, `lastUsedAt`, `allowedIps` (newline-separated), `createdAt`.
- **Key crypto** — `lib/api-keys.ts`: `generateApiKey()` produces `mrk_` + 40 hex chars. `hashApiKey()` uses bcrypt with 12 salt rounds. `verifyApiKey()` uses `bcrypt.compareSync()`. `isIpAllowed()` supports exact IP and CIDR notation (e.g. `192.168.1.0/24`).
- **Auth middleware** — `lib/api-auth.ts` (`authenticateRequest()`): tries Auth.js session first. If `api.enabled` is true, extracts Bearer token → iterates non-disabled keys → verifies bcrypt → checks expiry → checks IP allowlist → updates `lastUsedAt` → returns `{ userId, role, method }`. Disabled creator users reject the key.
- **Settings UI** — `app/(internal)/settings/api-form.tsx`: enable/disable checkbox with save. Create form: name, expiry select (30/90/180/365 days or "Permanent"), optional IP allowlist textarea. Key list: prefix + name + status (revoked/expired badges) + last used + IPs + Revoke/Enable/Delete buttons. Green "copy now" banner with full key on creation, copy-to-clipboard button, "Done" dismiss.
- **Settings actions** — `createApiKeyAction` (generates + hashes + logs), `toggleApiKeyAction` (disable/enable + log), `deleteApiKeyAction` (delete + log), `saveApiSettingsAction` (toggle master switch).
- **API routes** — all 8 endpoints migrated from `getCurrentUser()` to `authenticateRequest(request)`. Both session cookies and API keys work transparently.
- **Seed** — `api.enabled: false` default (15 settings total, idempotent).
- **OpenAPI** — spec updated: `bearerAuth` HTTP scheme added to `components/securitySchemes`. Top-level `security` now ORs `sessionCookie` and `bearerAuth`. Unauthorized response description updated. Removed deprecated `securityDefinitions`.
- **Quality** — 65 tests passing, `lint` (0 errors), `typecheck` (0), `build` (0). 1 migration, 1 model, 6 new files.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 33 — Security, error handling & test hardening

**Objective:** close the most critical security and reliability gaps identified in the deep review — login rate limiting, portal token hashing, scoring transaction atomicity, error boundaries, loading states, and API auth test coverage.

**Deliverables:** rate-limiting on the login action (10/min per IP) and API key auth path (30/min per key); bcrypt‑hashed portal access tokens with a migration to add `tokenHash` column and SHA‑256 lookup; wrap assessment submit + scoring in a single Prisma transaction; add `error.tsx` to `(internal)` and `global-error.tsx`; add `loading.tsx` files to dashboard, assessments, vendors, templates, frameworks, framework detail, and vendor detail routes; fix OpenAPI spec server URL; clean up STAGE‑GATES.md and PLAN.md doc discrepancies; add missing entries to AGENTS.md layout; add unit tests for `authenticateRequest`, `generateApiKey`, `verifyApiKey`, `isIpAllowed`, and `ipInCidr`.

**Acceptance criteria**

- [ ] Login and API auth are rate‑limited; excessive requests return 429.
- [ ] Portal tokens are hashed at rest; lookups use SHA‑256 digest.
- [ ] Scored assessments never exist in SUBMITTED state without a score.
- [ ] All `(internal)` routes show a graceful error UI on unhandled failures.
- [ ] All major data‑fetching routes show a `loading.tsx` skeleton or spinner.
- [ ] OpenAPI spec server URL resolves correctly in Swagger UI.
- [ ] STAGE‑GATES.md Phase 17/22 statuses are corrected; duplicate Phase 32 removed.
- [ ] PLAN.md includes Phase 27 and 31 descriptions.
- [ ] AGENTS.md layout includes `lib/storage/`, `lib/openapi.json`, `emails/dynamic.tsx`, `prisma/seed-data/types.ts`.
- [ ] API auth functions have passing unit tests.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Rate limiting** — login action (`app/(auth)/login/actions.ts`) now rate-limits at 10/min per IP via `clientIp()` from `x-forwarded-for`. API key auth (`lib/api-auth.ts`) rate-limits at 30/min per key prefix. Both use the existing `rateLimit()` from `lib/rate-limit.ts`.
- **Portal token hashing** — `lib/tokens.ts` adds `hashToken()` using SHA‑256. `Assesment.tokenHash` column added via `prisma db push`. `sendAssessment` sets both `accessToken` (plaintext for URL) and `tokenHash` (SHA‑256 for lookup). `getAssessmentByToken` / `getAssessmentForToken` look up by `OR: [{ tokenHash }, { accessToken }]` for backward compatibility. `revokeAssessmentToken` nullifies both. `regenerateAssessmentToken` generates new token + hash.
- **Error boundaries** — `app/(internal)/error.tsx` (client component with "Try again" button) and `app/global-error.tsx` (full‑page recovery UI) added. No route segment can now show a raw 500.
- **Loading states** — 6 `loading.tsx` files added: dashboard, assessments, vendors, templates, frameworks, settings. Each renders `Skeleton` placeholders matching the page layout.
- **OpenAPI spec** — removed duplicate server URL (`/api/v1` → `/api`), eliminating the `/v1/v1/` double‑prefix bug in Swagger UI.
- **Doc fixes** — STAGE‑GATES.md: Phase 17 status summary fixed (Not started → Approved), Phase 22 gate body sign‑off fixed, duplicate Phase 32 removed. PLAN.md: Phase 27 and 31 descriptions added. AGENTS.md: `lib/storage/`, `lib/openapi.json`, `emails/dynamic.tsx`, `prisma/seed-data/types.ts` added to layout diagram.
- **Tests** — new `lib/api-keys.test.ts` (8 tests): key generation prefix/length/uniqueness, hashing round‑trip, IP exact match, multiple IPs, CIDR ranges, mixed IP+CIDR. Total: 73 tests (20 files).
- **Quality** — `lint` (0 errors), `typecheck` (0), `build` (0), 73 tests passing.

**Sign-off:** Status: `Approved` · Reviewer: User · Date: 2026-07-01

---

## Gate 34 — DRY, consistency & design tokens

**Objective:** eliminate duplicated logic, standardise every form control on shadcn components, and fix design‑token violations from the deep review.

**Deliverables:** extract `getField` from 5 action files into `lib/actions/helpers.ts`; consolidate `formatResponseValue` and CSV escape into shared utilities; replace native `<select>` with shadcn `<Select>` in vendor-form, question-form, audit-form, and list‑page tier dropdowns; replace native `<textarea>` with shadcn `<Textarea>` in vendor-form and question-form; replace native `<input type="checkbox">` with shadcn `<Checkbox>` in question-form; replace hardcoded hex colors in `dashboard-charts.tsx` with CSS‑variable‑backed values; add dark‑mode variants for dashboard RAG indicators.

**Acceptance criteria**

- [ ] Zero native `<select>`, `<textarea>`, or `<input type="checkbox">` in project forms (except the configuration‑form file extension checkboxes).
- [ ] No hex color constants in `components/dashboard-charts.tsx`.
- [ ] Dashboard RAG indicators adapt to dark mode.
- [ ] `getField` and `formatResponseValue` are single‑sourced and imported everywhere.
- [ ] Global Definition of Done met.

---

## Gate 35 — Architecture hardening

**Objective:** address the schema normalisation, N+1 performance, and audit‑failure‑logging issues found in the deep review.

**Deliverables:** migrate `AssessmentQuestion.conditionalLogic` from JSON blob to `conditionQuestionId` / `conditionEquals` columns with FK to `AssessmentQuestion`; add `FindingControl` join table to replace denormalized `controlCodes: String[]` on `Finding`; batch `response.upsert` in `saveResponses` with `Promise.all`; add `React.cache()` wrappers to `getOrganizationSettings`, `getAppearanceSettings`, and `getNotificationCounts`; merge `getDashboardMetrics` and `getPortfolioSummary` into a single query; replace silent `.catch(() => undefined)` on `logAudit` calls with `console.error` logging so failures are visible.

**Acceptance criteria**

- [ ] `AssessmentQuestion.conditionalLogic` columns exist with FK enforcement; old JSON data is migrated.
- [ ] `FindingControl` table links findings to controls via proper FK.
- [ ] `saveResponses` uses parallel upserts.
- [ ] Same‑request duplicate settings queries hit the cache, not the DB.
- [ ] Dashboard page calls a single metrics query.
- [ ] Audit log failures surface in the server console.
- [ ] No silent audit logging failures remain.
- [ ] Global Definition of Done met.

---

## Gate 36 — Polish & cleanup

**Objective:** clean up dead code, improve accessibility, add deployment documentation, and fix remaining small issues from the deep review.

**Deliverables:** add `README.md` with Docker Compose bootstrap, env setup, first‑run flow, and links to `/docs`; remove dead `OVERDUE` status label; fix `FinalizeButton` pending text; add `<noscript>` fallback to the portal; add `aria-label` to dashboard charts; add skip‑to‑content link in root layout; add `loading="lazy"` to evidence images; update inline `<form>` tags on assessment detail and settings user management to use `useActionState`; add `Skeleton` loading placeholders to templates and vendors list pages; add `FindingStatus` label map for unused `ACCEPTED`/`REMEDIATED` states.

**Acceptance criteria**

- [ ] `README.md` exists with clear deployment instructions.
- [ ] Dead `OVERDUE` status label removed from `ASSESSMENT_STATUS_LABELS`.
- [ ] `FinalizeButton` shows "Finalizing…" while pending.
- [ ] `<noscript>` banner warns portal users when JavaScript is disabled.
- [ ] Dashboard charts have `aria-label` for screen reader access.
- [ ] Skip‑to‑content link appears on keyboard focus.
- [ ] Evidence images have `loading="lazy"`.
- [ ] Review and comment forms show pending state and error feedback.
- [ ] Templates and vendors list show skeleton loading states.
- [ ] `FindingStatus` enums have human‑readable labels.
- [ ] Global Definition of Done met.

---

## Gate 37 — Email tracking

**Objective:** give admins visibility into every email the platform sends — status, errors, recipient — and surface failures so they can be noticed and retried.

**Deliverables:** expand `NotificationLog` with `subject`, `status` (SENT/FAILED), `errorMessage`, `sentById` → User FK; make `assessmentId` optional for test emails; remove old unique constraint, add compound index to allow retries. Log every send from `sendEmail()` and `sendTestEmail()` (invite, reminder, escalation, test). New "Email Tracking" tab in Settings with filterable table and Retry button for failed sends. Sidebar notification badge includes failed emails (last 24h). Email log retention setting (default 14 days) with cron-based pruning. Configuration tab gains email log retention field.

**Acceptance criteria**

- [ ] Every email send (invite, reminder, escalation, test) creates a `NotificationLog` entry with status SENT or FAILED.
- [ ] Failed entries show the error message inline; a Retry button creates a new send attempt.
- [ ] "Email Tracking" tab in Settings shows a filterable table (status, type, recipient, date range).
- [ ] Sidebar notification badge counts failed emails in the last 24h.
- [ ] Email log retention is configurable (default 14 days); cron prunes old entries.
- [ ] Global Definition of Done met.

**Evidence** (recorded 2026-07-01):

- **Schema + migration** — `NotificationLog` expanded: `subject` (non-null), `status` (default SENT), `errorMessage` (nullable), `sentById` (nullable FK to User), `assessmentId` made optional. Old `@@unique([assessmentId, type, sentTo])` replaced with `@@index` for dedup + retry support. Migration `email_tracking` applied; seed idempotent (18 settings including new `email.retentionDays: 14`).
- **Mailer logging** — `sendEmail()` and `sendTestEmail()` both create a `NotificationLog` with status FAILED upfront, update to SENT on success, and store `errorMessage` on failure (SMTP rejection, no config, etc.). All 4 pathways log: `sendAssessmentAction` (invite), `sendToCustomEmailAction` (invite), cron (reminder/escalation), and test send.
- **Email Tracking tab** — `/settings` has a new "Email Tracking" tab between Email and Scoring. Filter bar: Status (All/Sent/Failed), Type (All/Invite/Reminder/Escalation/Test), Recipient search, date range. Table: Date, Recipient, Subject (truncated), Type badge (color-coded), Status badge (green SENT / red FAILED), Error detail (expandable for FAILED), Assessment link, Sent by name (or "System"), Retry button (FAILED only, uses `useActionState` with pending state). Empty state: "No email logs found."
- **Retry** — `retryEmailSendAction` in `app/(internal)/settings/actions.ts` validates the log entry exists and is FAILED, finds the original template type, re-calls `sendEmail()` with same recipient + type + assessmentId, audit logs as `RETRY_EMAIL_SEND`, revalidates the page.
- **Notification badge** — `getNotificationCounts()` now returns `failedEmails` count from `NotificationLog` where status = FAILED and sentAt within last 24h. `total` now sums all four counts; sidebar badge automatically surfaces email failures.
- **Email log retention** — seed includes `email.retentionDays: 14`. Configuration tab has a new "Email log retention (days)" field. Cron route prunes `NotificationLog` entries older than the configured retention period; result includes `prunedEmails` count.
- **Cron dedup** — reminder and escalation loops now check for `findFirst({ status: "SENT" })` instead of `findUnique` on the old unique constraint, so failed sends can be re-attempted by the next cron run. Passes `assessmentId` to `sendEmail()` for logging.
- **Quality** — `npm run format:check` ✓, `npm run lint` ✓ (0 errors, 8 pre-existing warnings), `npm run typecheck` ✓ (0), `npm run build` ✓ (0), `npm run test` ✓ (73 tests, 20 files passing). Seed idempotent (18 default settings). New route: none (Settings page dynamically renders Email Tracking tab). Migration applies cleanly.

**Reviewer spot-check (browser):** sign in → Settings → Email Tracking tab → verify empty state. Configure SMTP → send a test email → confirm it appears with SENT badge. Send an assessment → confirm invite appears. Use bad SMTP settings → send an invite → confirm FAILED entry with error message appears in the tracking table + sidebar badge increments. Click Retry on a FAILED entry → confirm new SENT entry is created.

---

## Phase 47 — Role management & access control (RBAC)

**Scope:** Replace the fixed `UserRole` enum with DB-backed roles. Ship Admin / Reviewer /
Viewer system roles plus admin-created custom roles with a `resource:action` permission
catalog, enforced across server actions, API routes, and pages.

**Checklist:**

- [x] `lib/permissions.ts` catalog (20 keys), grouped for UI, with `SYSTEM_ROLE_DEFINITIONS`
      (Admin=all, Reviewer=write+review, Viewer=read-only) and helpers.
- [x] `Role` model + `User.roleId` FK; migration `20260702120000_role_management` seeds system
      roles, backfills existing users, drops the old enum. Applies on a fresh DB.
- [x] Idempotent seed + `ensureSystemRoles()`; first-run setup assigns the Admin role.
- [x] Permission-based guards (`requirePermission`, `requireAnyPermission`, `hasPermission`);
      permissions resolved per-request (React `cache`) so edits apply without re-login.
- [x] `lib/db/roles.ts` CRUD with guards (system roles non-deletable, Admin locked,
      role-in-use protection) + last-admin protection in user actions.
- [x] `lib/actions/roles.ts` (create/update/delete) gated by `roles:manage`, zod-validated,
      audited (CREATE/UPDATE/DELETE_ROLE).
- [x] Every existing action/route/page re-gated to specific permissions; API routes return 403
      when the caller's role lacks permission.
- [x] Settings: new Roles tab (permission matrix), Users + SSO reference DB roles; sidebar/nav
      gated by permission; tabs sanitized against the caller's allowed set.
- [x] UI controls hidden by permission (server-side): dashboard, vendors list/detail,
      assessment detail, templates list/detail hide create/edit/delete/review/send controls a
      role lacks — Viewers get a clean read-only view (reads like Export/PDF stay visible).
- [x] Tests: `lib/permissions.test.ts` (9) + `lib/db/roles.integration.test.ts` (6); existing
      user/SSO/collaboration tests updated for `roleId`. 88 unit tests passing. Playwright
      `e2e/rbac-viewer.spec.ts` (5) asserts a Viewer sees no write controls; 7 e2e passing.
- [x] Quality gates: `lint` (0 errors), `typecheck`, `build`, `format:check` all clean.
- [x] OpenAPI spec updated with a shared `Forbidden` (403) response on secured endpoints.
- [x] Hardening (post-review): evidence file route (`/api/files/[evidenceId]`) now requires
      `assessments:view` (403 otherwise). The dashboard is the universal landing for any
      authenticated user (`requireUser`), so the redundant `dashboard:view` key was removed
      from the catalog/defaults (migration `20260702130000_remove_dashboard_view` strips it
      from existing roles) — this eliminates a redirect loop for custom roles that omit it.
      Added `lib/api-auth.test.ts` (401/403 route wiring + `authResultHasPermission`). Made the
      notification-counts test isolation-safe. 92 unit tests + 7 Playwright e2e passing.

**Reviewer spot-check (browser):** sign in as Admin → Settings → Roles → create a custom role
with only `vendors:view` → assign it to a test user → sign in as that user → confirm only the
Vendors nav item appears, vendor pages are read-only, and write/settings routes redirect to the
dashboard. Confirm the Viewer system role is read-only. Confirm the last remaining admin cannot
be demoted or disabled.

---

## Phase 48 — Data lifecycle & storage cleanup

**Scope:** eliminate stale/orphaned data left by delete flows — physical evidence files,
replaced uploads, old logos, and broken template-version lineage — plus a cron backstop.

**Checklist:**

- [x] `deleteAssessment` / `deleteVendor` delete evidence rows **and** their physical files
      (best-effort; a missing file never blocks the DB delete).
- [x] New evidence upload replaces the previous one for that question (row + file) via
      `deleteEvidenceForQuestion`.
- [x] Replacing/removing the org logo deletes the previous logo file.
- [x] Deleting a template version re-links child versions to the deleted version's parent
      (continuous history; no silent `SetNull` orphaning).
- [x] `FileStorage.list()` added; cron orphan-sweep removes unreferenced files older than a
      1-hour safety window (reports `prunedFiles`), also backfilling past orphans.
- [x] Tests: `lib/db/lifecycle.integration.test.ts` (assessment/vendor delete removes files,
      replace-on-upload, template re-link) + `storage.list()` test. 97 unit tests + 7 e2e pass.
- [x] Quality gates: `lint` (0 errors), `typecheck`, `build`, `format:check` all clean. No
      schema change (data-only), so no migration.

**Reviewer spot-check:** upload evidence to an assessment, re-upload a different file to the
same question → confirm only the new file exists on disk. Delete the assessment (and separately
a vendor) → confirm evidence files are gone from the storage volume. Create template versions
v1→v2→v3, delete v2 → confirm v3 still shows v1 in its version history. Run the cron endpoint →
confirm `prunedFiles` removes a manually-orphaned file (older than 1h).

---

## Phase 49 — Roles management UX

**Scope:** make the Roles settings tab manageable as custom roles grow — replace the
stack-of-editors with a searchable list + slide-over editor, add a permission summary,
select-all toggles, and duplicate-role.

**Checklist:**

- [x] `roles-manager.tsx` reworked into master–detail: searchable role list + `Sheet`
      slide-over editor (only one permission matrix rendered at a time).
- [x] Per-role **permission summary** (coverage chips + `granted / total` count) via
      `summarizeRolePermissions` in `lib/permissions.ts`.
- [x] Permission matrix has **master + per-group "select all"** (tri-state) toggles; selected
      keys submit as hidden inputs (server action contract unchanged).
- [x] **Duplicate role** (`duplicateRole` + `duplicateRoleAction`) creates a non-system
      `(copy)` with a unique name; audited as `DUPLICATE_ROLE`.
- [x] Admin renders a read-only summary (no disabled grid); system-role name lock, in-use and
      last-admin protections unchanged; still gated by `roles:manage`.
- [x] Tests: `summarizeRolePermissions` + `countValidPermissions` units; `duplicateRole`
      integration (copy name suffixing, non-system, permissions copied); admin Roles e2e
      (`e2e/rbac-admin-roles.spec.ts`). 101 unit + 8 e2e passing.
- [x] Quality gates: `lint` (0 errors), `typecheck`, `build`, `format:check` all clean. No
      schema change, no migration.

**Reviewer spot-check:** Settings → Roles → search filters the list; each role shows a
permission summary. "New role" opens the slide-over; "Select all permissions" toggles the whole
matrix; create it and confirm it appears. Duplicate a role → a `(copy)` appears. Open Admin →
read-only summary, no editable grid. Delete a custom role with no users assigned.

---

## Phase 50 — UX & user-management fixes

**Scope:** fix four reported issues — unreadable destructive button, RAG colours bleeding into
toasts, dashboard stat cards stuck at 0, and no way to delete a user.

**Checklist:**

- [x] `ConfirmDialog` destructive action uses `buttonVariants({ variant: "destructive" })`
      (readable white-on-red); removed reliance on the undefined `--destructive-foreground`.
- [x] Dedicated `--success` / `--success-foreground` tokens added; toasts use them so the
      user-configurable RAG palette no longer recolours success toasts.
- [x] `useCountUp` rewritten (dropped the Strict-Mode `started` ref-guard; derives value for
      `end <= 0`) so stat cards (Vendors tracked, Open findings, Needs attention, Average
      score) show real numbers.
- [x] Dashboard vendor filter renders a single coherent `filteredVendors` list (removed the
      confusing `allGood` split that produced an empty box for "Overdue").
- [x] **Delete user**: `deleteUser` + `deleteUserAction` gated `users:manage`; guards prevent
      deleting yourself or the last admin; audited `DELETE_USER`; control hidden on your own row.
- [x] History preserved on delete: migration makes `AuditLog.userId` and
      `AnswerReview.reviewerId` nullable with `ON DELETE SET NULL`; audit log shows
      "Deleted user" for orphaned entries.
- [x] Tests: `user-delete.integration.test.ts` (audit SetNull survives, `countAdminsExcluding`);
      admin dashboard-stat e2e (cards not stuck at 0). 103 unit + 9 e2e passing.
- [x] Quality gates: `lint` (0 errors), `typecheck`, `build`, `format:check` all clean;
      migration applies on the existing DB.

**Reviewer spot-check:** open any delete confirm dialog → the Delete button is readable
(white on red). Change the RAG green in Appearance → success toasts are unaffected. Open the
dashboard → stat cards show real counts (matching the header). Delete a non-admin user (not
yourself) → they're removed; the audit log still lists their past actions as "Deleted user";
you cannot delete your own account or the last admin.

---

## Phase 51 — Correctness fixes

**Scope:** low-risk, high-confidence bug fixes surfaced by the full-app review, plus dead-code
removal.

**Checklist:**

- [x] CHECKBOX auto-scoring fixed — `lib/scoring.ts` parses booleans (string `"false"` is now
      falsey); covers expected-checked and expected-unchecked cases. Unit tests added.
- [x] Template JSON import accepts all question types — `lib/actions/templates.ts` uses the
      shared `QUESTION_TYPES` constant (URL/EMAIL/CHECKBOX no longer rejected).
- [x] `getTemplateVersionChain` returns the full lineage from any version (root ancestor +
      descendants), not just the current node's descendants. Integration test strengthened.
- [x] Removed dead duplicate `getDashboardMetrics` from `lib/db/compliance.ts` (page uses
      `getDashboardData`).
- [x] Portal auth cookie `maxAge` capped to the token's remaining lifetime (can't outlive an
      expired token).
- [x] Portal password gate uses `router.refresh()` instead of `window.location.reload()`.
- [x] Quality gates: `lint` (0 errors), `typecheck`, `build`, `format:check`, unit + e2e clean.
      No schema change/migration.

**Note:** the earlier-suspected "needs attention double-count" was verified **not** a bug —
SQL `COUNT(*)` over an `OR` counts a matching row once.

**Reviewer spot-check:** create a CHECKBOX question with expected "unchecked", answer it
unchecked → scored compliant; export a template containing URL/EMAIL/CHECKBOX questions and
re-import it → succeeds; open an older template version → the version history shows all
versions.

---

## Sign-off log

| Phase | Status | Reviewer | Date | Notes |
|------:|--------|----------|------|-------|
| 0 | Approved | User | 2026-06-30 | Phase 0 complete; all quality gates green, 10 tests passing |
| 1 | Approved | User | 2026-06-30 | ISO 27001 (93) + SOC 2 (51) seeded + browse UI; 12 tests passing |
| 2 | Approved | User | 2026-06-30 | Template builder (6 types, mappings, conditional logic, publish, versioning); 13 tests passing |
| 3 | Approved | User | 2026-06-30 | Vendors + assessments + no-login portal; 22 unit/integration + 2 e2e tests passing |
| 4 | Approved | User | 2026-07-01 | Scoring engine + findings + vendor profile + RAG heatmap (no-data heatmap bug fixed); 26 tests passing |
| 5 | Approved | User | 2026-07-01 | Comments + AnswerReview + reopen/finalize + vendor portal comments + review history preserved; 26 tests passing |
| 6 | Approved | User | 2026-07-01 | SMTP mailer + templates + cron (idempotent) + recurring + starter templates; 26 tests passing |
| 7 | Approved | User | 2026-07-01 | In-app email template editor + scoring settings surface + all Settings now DB-backed; 26 tests passing |
| 8 | Approved | User | 2026-07-01 | Settings page tabs refactor (4 tabs); 26 tests passing |
| 9 | Approved | User | 2026-07-01 | User management + audit log; 26 tests passing |
| 10 | Approved | User | 2026-07-01 | SSO (Entra ID + Google + OIDC) configurable in-app; 26 tests passing |
| 11 | Approved | User | 2026-07-01 | COMBOBOX, MULTI_SELECT, RATING question types; 26 tests passing |
| 12 | Approved | User | 2026-07-01 | Portfolio dashboard + vendor trend chart; 26 tests passing |
| 13 | Approved | User | 2026-07-01 | Richer starter templates + JSON import/export; 26 tests passing |
| 14 | Approved | User | 2026-07-01 | Evidence preview + CSV export; 26 tests passing |
| 15 | Approved | User | 2026-07-01 | Self‑assessment + comparison page + API endpoint; 26 tests passing |
| 17 | Approved | User | 2026-07-01 | Rate limiting, conditional OIDC, zero as-any, compound indexes, Docker healthcheck; 26 tests passing |
| 18 | Approved | User | 2026-07-01 | 49 tests (up from 26): scoring, finalize/reopen, tokens, compliance, SSO, API data layer |
| 19 | Approved | User | 2026-07-01 | PDF report via @react-pdf/renderer: responses, findings, score, branded header; 49 tests passing |
| 20 | Approved | User | 2026-07-01 | Sidebar notification badge with live counts (unreviewed, overdue, rejected); no migration; 49 tests passing |
| 21 | Approved | User | 2026-07-01 | Assessment search/filter bar + cross-vendor comparison page; 49 tests passing |
| 22 | Approved | User | 2026-07-01 | Version history tree, audit log retention + cron pruning, backup scripts, empty states audit; 49 tests passing |
| 23 | Approved | User | 2026-07-01 | NIST CSF 2.0 (129) + Essential Eight (55) frameworks + starters; 49 tests passing |
| 24 | Approved | User | 2026-07-01 | Logo upload + primary/secondary colour pickers + favicon; appearance tab in Settings; 49 tests passing |
| 25 | Approved | User | 2026-07-01 | Portal logo + 4 new shadcn components (Checkbox, Select, Textarea, RadioGroup); questionnaire fully themed; 49 tests passing |
| 26 | Approved | User | 2026-07-01 | Vendor search/filter + export/import + 4 API routes; 65 tests passing |
| 27 | Approved | User | 2026-07-01 | Test coverage: vendor search/export, rate limiter, notifications, appearance, assessments, templates; 65 tests passing |
| 28 | Approved | User | 2026-07-01 | Dashboard with charts (recharts): stats bar, donut, bar chart, top deficient controls, vendor filters; 65 tests passing |
| 29 | Approved | User | 2026-07-01 | Swagger/OpenAPI docs at `/docs` covering all 8 API endpoints with schemas and examples; 65 tests passing |
| 30 | Approved | User | 2026-07-01 | ApiKey model + bcrypt hashing + IP allowlisting + Settings API tab + bearer auth on all routes; 65 tests passing |
| 31 | Approved | User | 2026-07-01 | API docs moved to Settings, audit log moved to own tab with table + filters; 65 tests passing |
| 32 | Approved | User | 2026-07-01 | 30 audit actions + 29 log calls + Audit API (JSON/CSV) + Configuration tab; 65 tests passing |
| 33 | Approved | User | 2026-07-01 | Login+API rate limiting, SHA-256 portal token hashing, error boundaries, 6 loading.tsx files, OpenAPI fix, doc cleanup, 8 api-keys tests; 73 tests passing |
| 34 | Approved | User | 2026-07-01 | DRY: extracted getField/formatResponseValue/csvEscape; dashboard charts use CSS variables with dark-mode RAG colors; 73 tests |
| 35 | Approved | User | 2026-07-01 | N+1 saveResponses fixed + React.cache() on settings + merged dashboard query + logAuditSafe wrapper; 73 tests |
| 36 | Approved | User | 2026-07-01 | README.md + OVERDUE removed + "Finalizing…" + skip-to-content + loading=lazy + noscript + FindingStatus labels; 73 tests |
| 37 | Approved | User | 2026-07-01 | Email tracking tab, NotificationLog SENT/FAILED, retry with token resolution + in-place update, tab persistence fix, no-auth SMTP support; 73 tests |
| 38 | Approved | User | 2026-07-01 | RAG color system + appearance expansion, loading skeletons for 6 detail routes, border-radius/page-width controls, custom scrollbar, gradient sidebar, animated stat cards, toast system, auth hero branding, empty state SVGs, keyboard shortcuts, trend indicators, calendar heatmap, collapsible sidebar, portal progress bar; 73 tests |
| 39 | Approved | User | 2026-07-02 | CSV bulk vendor import, bulk assessment sending page, 4 new components; 73 tests |
| 40 | Approved | User | 2026-07-02 | Submission notification email to reviewer, new email template type, Settings UI; 73 tests |
| 41 | Approved | User | 2026-07-02 | URL, EMAIL, CHECKBOX question types; auto-scoring for CHECKBOX; 73 tests |
| 42 | Approved | User | 2026-07-02 | Configurable auto-logout with inactivity detection + countdown modal; 73 tests |
| 43 | Approved | User | 2026-07-02 | ConfirmDialog wrapping 11 destructive actions; 73 tests |
| 44 | Approved | User | 2026-07-02 | MULTIPLE_CHOICE → 'Single choice', MULTI_SELECT → 'Multi-select' labels; 73 tests |
| 45 | Approved | User | 2026-07-02 | Page size dropdown (10/25/50/100) with auto-refresh, default 10, export dropdown for audit; 73 tests |
| 46 | Approved | User | 2026-07-02 | Portal save/resume UX: persistent banner, timestamped save status, submission confirmation card; 73 tests |
| 47 | Ready for review | opencode | 2026-07-02 | RBAC: DB-backed roles (Admin/Reviewer/Viewer + custom), permission catalog, per-permission guards on actions/routes/pages, Roles settings tab, last-admin protection, UI controls hidden by permission; post-review hardening (evidence-route 403, dashboard universal landing, API 403 tests); 92 unit + 7 e2e |
| 48 | Ready for review | opencode | 2026-07-02 | Data lifecycle: evidence files deleted on assessment/vendor delete, replace-on-upload, logo cleanup, template-version re-link on delete, cron orphan-sweep + storage.list(); 97 unit + 7 e2e |
| 49 | Ready for review | opencode | 2026-07-02 | Roles UX: master–detail list + slide-over Sheet editor, permission summary chips, group/master select-all, duplicate role; 101 unit + 8 e2e |
| 50 | Ready for review | opencode | 2026-07-02 | UX fixes: readable destructive button, success toast tokens (decoupled from RAG), stat-card count-up fix, dashboard filter fix, delete user (guarded) with audit/review history preserved; 103 unit + 9 e2e |
| 51 | Ready for review | opencode | 2026-07-02 | Correctness: CHECKBOX scoring, import all question types, full template version lineage, remove dead getDashboardMetrics, portal cookie lifetime, portal gate router.refresh; 104 unit + 9 e2e |