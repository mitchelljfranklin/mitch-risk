# Phase 47 — Role Management & Access Control (RBAC)

> **Status: implemented — Ready for review.** All work packages below are complete; quality
> gates (lint/typecheck/build/format) and the test suite (92 unit + 7 Playwright e2e) pass.
> UI controls are hidden by permission server-side (Viewers get a clean read-only view), and
> `e2e/rbac-viewer.spec.ts` asserts this. See the Phase 47 gate in `docs/STAGE-GATES.md`.
>
> **Post-review hardening:** (1) the evidence file route requires `assessments:view`; (2) the
> dashboard is the universal landing for any authenticated user, so the redundant
> `dashboard:view` permission was removed (migration `20260702130000_remove_dashboard_view`),
> eliminating a redirect loop for custom roles that omit it; (3) added API 401/403 route tests.

Working record for the role management feature. Review before starting; keep accurate as
reality changes. Follows the gated-phase conventions in `docs/PLAN.md` and
`docs/STAGE-GATES.md`.

## Goal

Replace the fixed `UserRole` enum (`ADMIN`/`REVIEWER`) with DB-backed roles. Ship three
system roles — **Admin**, **Reviewer**, **Viewer** — plus admin-created **custom roles**,
each carrying a set of granular `resource:action` permissions. Enforce permissions across
pages, server actions, and API auth.

> Note: `docs/PLAN.md` §8 previously listed "complex role hierarchies" as out of scope for
> v1. This phase intentionally introduces flat, permission-based roles (not hierarchies) and
> updates that note.

## Design decisions (confirmed)

- **Granularity:** `resource:action` permission catalog (code-defined constant, ~24 keys).
- **Defaults:** Admin = all; Reviewer = write + review (no users/roles/settings);
  Viewer = read-only.
- **System roles:** non-deletable; Admin's permission set locked to "all". Reviewer/Viewer
  editable. Custom roles fully editable/deletable.
- **API keys:** continue inheriting the creator's role (now = creator's role permissions).
  No key-level scoping this phase.

---

## 1. Permission catalog — `lib/permissions.ts` (new)

Single source of truth. `as const` catalog + types + default role definitions.

Permissions (`resource:action`):

```
dashboard:view
vendors:view | vendors:create | vendors:edit | vendors:delete
assessments:view | assessments:create | assessments:edit | assessments:review | assessments:delete
templates:view | templates:create | templates:edit | templates:delete
frameworks:view | frameworks:edit
audit:view
users:manage
roles:manage
settings:manage
api:manage
```

- Export `PERMISSION_GROUPS` (grouped by resource, with human labels) to drive the UI
  checkbox matrix.
- Export `SYSTEM_ROLE_DEFAULTS`:
  - **Admin** → all permissions (locked).
  - **Reviewer** → `dashboard:view`, all `vendors:*`, `assessments:view/create/edit/review`,
    all `templates:*`, `frameworks:view`.
  - **Viewer** → all `*:view` keys only.
- Helpers: `hasPermission(userPermissions, key)`, `hasAllPermissions`, `isValidPermission`.
- Constants for the three system role names (`SYSTEM_ROLE_NAMES`).

## 2. Data model & migration — `prisma/schema.prisma`

New model:

```prisma
model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  permissions String[]           // permission keys from the catalog
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  users       User[]
  @@map("roles")
}
```

`User`: replace `role UserRole @default(REVIEWER)` with `roleId String` +
`role Role @relation(fields: [roleId], references: [id])`.

Migration (multi-step SQL in one Prisma migration):

1. Create `roles` table.
2. Insert 3 system roles with default permission arrays + `isSystem = true`.
3. Add nullable `roleId` to `users`.
4. Backfill: `ADMIN` → Admin role id, `REVIEWER` → Reviewer role id.
5. Set `roleId` NOT NULL + FK; drop old `role` column; drop `UserRole` enum.

**Idempotent seed** (`prisma/seed.ts`): upsert the three system roles by name, reconcile
Admin's permission set to the full catalog on every seed.

## 3. Auth core & guards — `lib/auth.ts` + `types/next-auth.d.ts`

- `types/next-auth.d.ts`: replace `role: UserRole` with `roleId: string` and
  `roleName: string`; add `permissions: string[]` to `Session.user`.
- JWT callback: store `roleId` on the token (not the permission list — avoids staleness).
- Session callback / `getCurrentUser()`: resolve the role's `permissions` + `roleName` from
  DB via a **request-cached** lookup (`react.cache`) keyed by `roleId`, so permission edits
  take effect without re-login.
- New guards (keep `requireUser`):
  - `hasPermission(key)` — boolean, no redirect.
  - `requirePermission(key)` — redirect to `/dashboard` if lacking.
  - Reimplement `requireAdmin()` as `requirePermission("settings:manage")` for back-compat,
    then migrate call sites to specific permissions.

## 4. Data-access layer — `lib/db/roles.ts` (new) + `lib/db/users.ts`

- `roles.ts`: `listRoles`, `getRole`, `createRole`, `updateRole`, `deleteRole`,
  `countUsersInRole`, `getRoleByName`. Guards: block deleting `isSystem` roles, block editing
  Admin permissions, block deleting a role with assigned users.
- `users.ts`: change `changeUserRole(id, roleId)`, `createUser({... roleId})`;
  `listUsersFull`/`listUsers` include related role `{ id, name }`. Add last-admin guard helper
  `countUsersWithPermission("settings:manage")`.

## 5. Server actions

- New `lib/actions/roles.ts`: `createRoleAction`, `updateRoleAction`, `deleteRoleAction` —
  gated by `requirePermission("roles:manage")`, zod-validated (new schema in `lib/schemas/`),
  audited (`CREATE_ROLE`/`UPDATE_ROLE`/`DELETE_ROLE`), permission keys validated against the
  catalog.
- `lib/actions/users.ts`: swap enum handling for `roleId`; guard `users:manage`; prevent
  self last-admin demotion.
- Refactor guard calls to specific permissions across existing actions:
  - `vendors.ts` → `vendors:create/edit/delete`
  - `assessments.ts` → `assessments:create/edit/review/delete`
  - `templates.ts` → `templates:create/edit/delete`
  - `settings/actions.ts` (12 calls) → `settings:manage` (API ones → `api:manage`)
  - reads stay on `requireUser()`.

## 6. UI — Settings

- New **Roles** tab in `app/(internal)/settings/page.tsx` (gated `roles:manage`):
  - Role list (name, description, user count, system badge).
  - `role-form.tsx` (new): create/edit with permission **checkbox matrix** grouped by
    `PERMISSION_GROUPS`; Admin row locked/read-only; delete via existing `confirm-dialog`.
- **Users** tab: role `<Select>` populated from `listRoles()` (not the two hardcoded enum
  options) in both `add-user-form.tsx` and the change-role form.
- **SSO** form: auto-provision role select populated from DB roles (stores `roleId`).
- Page-level gate: change settings page from `requireAdmin()` to
  `requirePermission("settings:manage")`; render tabs conditionally by permission.

## 7. Navigation & layout

- `app/(internal)/layout.tsx`: pass `permissions` to sidebar/menu instead of `isAdmin`.
- `components/app-sidebar.tsx`: gate each nav item by the relevant `:view`/manage permission
  (Settings → `settings:manage` OR `users:manage` OR `roles:manage`).

## 8. SSO & API auth

- `lib/auth.ts` `resolveSsoUser`: assign `roleId` from `ssoSettings.autoProvisionRoleId`;
  OIDC default profile → Reviewer role id.
- `lib/settings/schema.ts`: SSO `autoProvisionRole` → `autoProvisionRoleId`.
- `lib/api-auth.ts`: `AuthResult` carries `roleId` + resolved `permissions` (from creator's
  role); no behaviour change for existing routes.

## 9. Seed, docs, tests

- **Seed:** system roles (idempotent); ensure `setup/actions.ts` assigns the first user the
  Admin role id.
- **Docs:** update `docs/PLAN.md` (add Phase 47, adjust §8 out-of-scope note),
  `docs/STAGE-GATES.md` (new gate checklist), `AGENTS.md` (Role model note). `lib/openapi.json`
  — no new REST endpoints, so no change (roles managed via server actions).
- **Tests (Vitest):**
  - `permissions` catalog: default role sets, `hasPermission`, validation.
  - `lib/db/roles`: CRUD + system/last-admin/assigned-user guards.
  - `lib/actions/roles`: permission gating, zod validation, audit.
  - Update existing user tests for `roleId`.
  - Guard tests for `requirePermission`.

## 10. Verification (gate)

Run `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test`,
`npm run format:check`; apply migration on a fresh DB + seed; manual smoke: create custom
role, assign to a user, confirm Viewer is read-only and blocked from write actions/nav.

---

## Key risks / notes

- **Largest surface:** refactoring ~45 action guards + 20 pages from binary
  `requireUser/requireAdmin` to permission checks. Mechanical but broad.
- **Migration is destructive** (drops enum column) — the backfill step must be correct before
  applying NOT NULL.
- **Permission freshness:** resolving permissions per-request (cached) rather than baking them
  into the JWT avoids stale-permission bugs at a small query cost.

## After this phase (new normal workflow)

Once Phase 47 lands, RBAC becomes part of the standard Definition of Done: every new feature
defines its permission key(s) in `lib/permissions.ts`, wires them into the default system
roles, gates its server actions/routes/pages with `requirePermission`, and gates its nav/UI
by permission. See the RBAC rule added to `AGENTS.md`.
