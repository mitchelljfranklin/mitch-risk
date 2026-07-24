# Customer Responsibility Tracking

> Track your own obligations when a vendor holds a certification with shared-responsibility controls (SOC 2, ISO 27001, NIST CSF, or any framework you import).

---

## Overview (for review)

### The problem

When a vendor is SOC 2 or ISO 27001 certified, that certification doesn't mean *you* are compliant. These frameworks define a **shared responsibility model** — some controls are the vendor's job (they secure the platform), and some are *yours* (you enforce MFA for your users, you conduct access reviews, you classify the data you store).

Right now mitch-risk says *"Vendor A is 94% compliant with SOC 2"* — but if 8 of those controls are actually your responsibility and you haven't done them, you're not at 94%. You don't know where you stand.

### What this feature does

When you record a vendor's certification, mitch-risk can automatically create a **customer responsibility checklist** — a list of controls that are designated as your responsibility under that certification's framework. This works for any framework, not just SOC 2.

```
┌─────────────────────────────────────────────────────────────┐
│ Customer Responsibility (SOC 2 Type II)                      │
│                                                              │
│ These controls are your responsibility under this            │
│ vendor's SOC 2 report.                         [Collapse ▲]  │
│                                                              │
│ Progress: ████████░░░░░░  4 of 12 completed                  │
│                                                              │
│ CC6.1   Enforce MFA for all users                  [✔ Done] │
│ CC6.2   Conduct quarterly access reviews    [▶ In Progress]  │
│ CC7.1   Classify stored data                  [○ Pending]   │
│ CC9.1   Review audit logs monthly             [○ Pending]   │
│ CC9.2   Conduct risk assessments annually     [○ Pending]   │
│                                                              │
│ Your compliance: 33%    ·  Vendor compliance: 94%            │
│ Combined risk posture: 76%                                   │
└─────────────────────────────────────────────────────────────┘
```

For each item in the checklist you can:

- **Track status** — Pending, In Progress, Completed, or Not Applicable
- **Assign it** to a team member
- **Add notes** and **attach evidence** (screenshots, policy documents, audit records)
- **Mark it done** — mitch-risk records when and by whom

The checklist feeds into:

- The **vendor compliance view** — now split into "Vendor compliance" and "Your compliance"
- The **dashboard** — "Your overall responsibility posture" across all vendors
- The **risk register** — unfinished responsibility items surface alongside findings
- The **certification expiry reminders** — already covered, reminders still go out

### How it works (user perspective)

1. **Admin marks controls as shared responsibility** — via the Frameworks settings page, an admin can check a box on any control to designate it as a customer responsibility. SOC 2 ships with 12 controls pre-marked based on the published shared-responsibility matrix. You can mark controls in any framework you've imported (ISO 27001, NIST CSF, Essential Eight, or your own custom CSV import).

2. **You add a certification to a vendor** — existing flow: cert name, issuer, dates, attachment. If the cert's name matches a known framework whose controls have `isSharedResponsibility` set, actions are auto-generated.

3. **The checklist appears** on the vendor detail page below the certification. No new pages, no extra navigation.

4. **Over time, you update each item** as you implement the controls. Evidence can be attached per item.

5. **mitch-risk shows your progress** alongside the vendor's own compliance score, rolling up into a combined risk posture.

### How it's framework-agnostic

The mechanism is not hardcoded to SOC 2 or ISO 27001. It works against a single boolean on the `Control` model: `isSharedResponsibility`. Any control in any framework can be flagged — whether it ships pre-seeded (SOC 2), you add it manually (ISO 27001), or you import a custom framework via CSV.

The auto-generation logic works like this:

```
Certification saved
  → Match cert name to a Framework (e.g. "SOC 2 Type II" → Framework "SOC 2")
  → Fetch controls in that Framework where isSharedResponsibility = true
  → Upsert CustomerResponsibilityAction rows for those controls
```

If a certification doesn't match a known framework, or if the matched framework has no shared-responsibility controls marked, nothing is generated. The admin can mark controls at any time via the Frameworks settings.

### What ships pre-loaded

SOC 2 shared-responsibility controls (12 controls across CC6, CC7, CC8, CC9, PI1) are pre-seeded as `isSharedResponsibility = true` based on the published AICPA Trust Services Criteria shared-responsibility matrix.

### What this doesn't do (out of scope)

- It doesn't replace the existing questionnaire/assessment/scoring flow — that's still how you assess *vendor* compliance
- It doesn't automatically verify that you've done the control (you self-attest)
- It doesn't integrate with your own internal GRC tool
- It doesn't enforce policy
- It doesn't send email reminders for overdue actions (future cron enhancement)
- It doesn't have dedicated API endpoints (server actions only in v1)

---

## Technical Design

### Data model

#### New model: `CustomerResponsibilityAction`

```prisma
model CustomerResponsibilityAction {
  id                String                         @id @default(cuid())
  vendorId          String
  vendor            Vendor                         @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  certificationId   String?
  certification     VendorCertification?           @relation(fields: [certificationId], references: [id], onDelete: SetNull)
  controlCode       String
  frameworkName     String
  controlTitle      String
  status            CustomerResponsibilityStatus   @default(PENDING)
  assignedToId      String?
  assignedTo        User?                          @relation(fields: [assignedToId], references: [id], onDelete: SetNull)
  notes             String?
  completedAt       DateTime?
  createdAt         DateTime                       @default(now())
  updatedAt         DateTime                       @updatedAt

  @@unique([vendorId, certificationId, controlCode])
  @@index([vendorId])
  @@index([vendorId, status])
  @@index([assignedToId])
  @@map("customer_responsibility_actions")
}

enum CustomerResponsibilityStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  NOT_APPLICABLE
}
```

#### Addition to `Control` model

```prisma
model Control {
  // ... existing fields ...
  isSharedResponsibility Boolean @default(false)
}
```

### How auto-generation works

When a certification is saved via `saveCertificationAction()`:

1. **Framework matching:** The certification name is matched against known frameworks. A `matchFrameworkForCertification(certName)` helper uses substring matching (e.g. `"SOC 2 Type II"` matches the framework named `"SOC 2"`, `"ISO 27001:2022"` matches `"ISO 27001"`).

2. **Control lookup:** All controls in the matched framework where `isSharedResponsibility = true` are fetched.

3. **Upsert:** For each shared control, a `CustomerResponsibilityAction` is upserted on `(vendorId, certificationId, controlCode)`. If a row already exists (from a previous save or a prior certification), the existing status, notes, and assignment are preserved.

4. **No match, no action:** If the certification name doesn't match any known framework, or the matched framework has zero shared-responsibility controls, nothing happens. The certification is saved as normal.

5. **Certification deletion:** Linked responsibility actions have `certificationId` set to `null` (SetNull), preserving the implementation record. The checklist remains visible but shows "Certification removed" instead of the cert name.

### Controls management UI

The **Frameworks → Controls detail page** (`app/(internal)/frameworks/[frameworkId]/controls/[controlId]/page.tsx` or the framework detail page's controls list) gains a **"Shared Responsibility"** checkbox per control, editable by users with `FRAMEWORKS_EDIT`. This is the same permission that allows editing framework metadata.

The checkbox appears as a toggle in an existing or new column on the controls list view, and as a field on the control detail/edit form. When toggled, the control's `isSharedResponsibility` flag is updated immediately.

---

## Phased Implementation Plan

### Phase 1 — Schema & seed

**What it delivers:** Migration applied, seed data correct, database layer working. Nothing visible to users yet.

| Task | Detail |
|---|---|---|
| Add `CustomerResponsibilityAction` model + `CustomerResponsibilityStatus` enum to `prisma/schema.prisma` | |
| Add `isSharedResponsibility` field to `Control` model | |
| Create + apply migration | |
| Add `isSharedResponsibility` flags to SOC 2 seed data (`prisma/seed-data/soc2.ts`) | 13 controls pre-marked |
| Update `prisma/seed.ts` to write `isSharedResponsibility` on framework upsert | |
| Create `lib/db/customer-responsibility.ts` | `listActionsByVendor(vendorId)`, `matchFrameworkForCertification(certName)`, `listSharedControlsForFramework(frameworkName)` |
| Update `lib/schemas/framework.ts` — add optional `isSharedResponsibility` to CSV row schema | Accepts `true`/`false`/`1`/`0`/`yes` |
| Update `lib/actions/frameworks.ts` — parse `is_shared_responsibility` column from CSV imports | Optional column, defaults to `false` when absent |
| Update `app/(internal)/frameworks/import/import-form.tsx` — add column to template and help text | Downloadable CSV template includes the new column |

**Gate:**
- [ ] Migration applies cleanly on fresh database
- [ ] Seed runs idempotently — re-running doesn't duplicate controls or flags
- [ ] `listActionsByVendor()` returns empty array on a vendor with no certs
- [ ] `matchFrameworkForCertification("SOC 2 Type II")` returns the SOC 2 framework
- [ ] `matchFrameworkForCertification("Some custom audit")` returns null
- [ ] CSV import with `is_shared_responsibility` column correctly marks controls
- [ ] CSV import without `is_shared_responsibility` column defaults controls to `false`
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` clean

**Effort:** ~0.5 day

---

### Phase 2 — Auto-generation on certification save

**What it delivers:** When a certification matching a known framework is saved on a vendor, shared-responsibility actions are automatically created. Verifiable by saving a cert and checking the DB.

| Task | Detail |
|---|---|
| Complete `upsertActionsForCertification()` in `lib/db/customer-responsibility.ts` | Match cert → framework → find shared controls → upsert rows |
| Wire into `saveCertificationAction()` in `lib/actions/certifications.ts` | After cert save, call auto-generation |
| Handle edge cases: cert doesn't match any framework (no-ops), framework has zero shared controls (no-ops), re-saving same cert (idempotent upsert), deleting a cert (SetNull on linked actions) | |
| Add zod schema `customerResponsibilityActionSchema` to `lib/schemas/certification.ts` | For future write operations |

**Gate:**
- [ ] Saving a SOC 2 certification on a vendor creates ~12 PENDING actions in the DB
- [ ] Saving a certification that doesn't match any known framework creates zero actions
- [ ] Saving a certification on NIST CSF with one shared control creates exactly one action
- [ ] Re-saving the same certification does NOT duplicate actions
- [ ] Deleting a certification sets `action.certificationId = null` (preserves action data)
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` clean

**Effort:** ~0.5 day

---

### Phase 3 — Read-only checklist on vendor detail

**What it delivers:** The customer responsibility checklist appears on the vendor detail page as a read-only card. Users can see what's needed but can't interact yet.

| Task | Detail |
|---|---|
| Create `components/customer-responsibility-manager.tsx` | Server component: fetches actions by vendorId, groups by certification |
| Create `components/customer-responsibility-checklist.tsx` | Client component: renders a collapsible card per certification, lists actions with status badges, shows progress bar |
| Wire into `app/(internal)/vendors/[vendorId]/page.tsx` | New section below Certifications card |
| Handle empty states: vendor with no certs (nothing shown), vendor with cert but no actions (informational message), vendor with cert where all shared controls completed (full progress bar) | |
| Progress bar: `completed / total` with color coding (red < 50%, amber < 100%, green 100%) | |

**Gate:**
- [ ] Vendor with SOC 2 cert shows "Customer Responsibility" card(s) grouped by certification
- [ ] Card shows: certification name, progress bar, list of controls with status badges
- [ ] Vendor with no certifications has no customer responsibility section
- [ ] Vendor with a certification that has no shared controls shows no checklist, or an informational message
- [ ] UI elements gated by `VENDORS_VIEW` permission (server-side guard)
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` clean

**Effort:** ~1 day

---

### Phase 4 — Checklist interactivity

**What it delivers:** Full CRUD on checklist items — status changes, notes, user assignment, evidence upload. The checklist becomes actionable.

| Task | Detail |
|---|---|
| Add `updateAction(actionId, data)` to `lib/db/customer-responsibility.ts` | Update status, notes, assignedToId, completedAt |
| Add `bulkUpdateActions()` to `lib/db/customer-responsibility.ts` | Mark-all-as type operations |
| Create `lib/actions/customer-responsibility.ts` | Server action: `updateResponsibilityAction()`, gated by `VENDORS_EDIT` |
| Expand `customer-responsibility-checklist.tsx` | Inline status dropdown (Pending / In Progress / Completed / Not Applicable), notes textarea, assigned-to user picker |
| Add evidence upload per action | Reuse existing `Attachment` model (`entityType = "CustomerResponsibilityAction"`), existing file upload pattern from certifications |
| Auto-calculate `completedAt` | Marking Complete auto-sets timestamp; unmarking clears it |
| Audit logging | `UPDATE_RESPONSIBILITY_ACTION`, `SET_RESPONSIBILITY_ACTION` audit entries |
| RBAC on all write controls | Hide status dropdown, notes field, assignment picker, and upload button when user lacks `VENDORS_EDIT` |

**Gate:**
- [ ] Each action can be set to Pending / In Progress / Completed / Not Applicable via dropdown
- [ ] Marking Complete auto-sets `completedAt`; changing away from Complete clears it
- [ ] Actions can be assigned to an internal user via a user picker
- [ ] Notes can be added and edited inline per action
- [ ] Evidence files can be attached and removed per action (reuses existing Attachment infrastructure)
- [ ] All write controls hidden when user lacks `VENDORS_EDIT`
- [ ] Progress bar updates in real time when an action status changes
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` clean

**Effort:** ~1.5 days

---

### Phase 5 — Controls management UI ("Shared Responsibility" checkbox)

**What it delivers:** Admins can mark controls as shared responsibility via the Frameworks settings. This makes the feature work for any framework, not just SOC 2.

| Task | Detail |
|---|---|
| Add `updateControlSharedResponsibility(controlId, value)` to `lib/db/frameworks.ts` or a new helper | Simple boolean update on Control |
| Add server action `toggleSharedResponsibilityAction()` gated by `FRAMEWORKS_EDIT` | |
| Add a "Shared Responsibility" checkbox column to the controls list on the framework detail page | `app/(internal)/frameworks/[frameworkId]/page.tsx` |
| Add the checkbox to the control detail/edit page | `app/(internal)/frameworks/[frameworkId]/controls/[controlId]/page.tsx` |
| Audit logging | `MARK_CONTROL_SHARED`, `UNMARK_CONTROL_SHARED` audit entries |

**Gate:**
- [ ] Framework detail page shows a "Shared Responsibility" column on the controls table
- [ ] Toggling a control's checkbox persists immediately
- [ ] Control detail page has a "Shared Responsibility" toggle
- [ ] Controls visible/hidden based on `FRAMEWORKS_EDIT` permission
- [ ] Marking a control as shared does NOT retroactively generate actions for existing certifications (Phase 2 handles generation on cert save only, which is intentional — the admin re-saves the cert if needed)
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` clean

**Effort:** ~0.5 day

---

### Phase 6 — Scoring & risk register integration

**What it delivers:** Customer responsibility feeds into the compliance view and risk register. Combined risk posture is visible.

| Task | Detail |
|---|---|
| Add `getCustomerResponsibilityCompliance(vendorId)` to `lib/db/customer-responsibility.ts` | Returns `{ total, completed, inProgress, pending, n_a, percent }` per vendor |
| Add `getPortfolioResponsibilitySummary()` to `lib/db/customer-responsibility.ts` | Aggregated across all vendors |
| Update `lib/db/compliance.ts` or create new helper | Returns split metrics: vendor compliance + customer compliance |
| Update vendor detail compliance tab | Show "Vendor compliance" and "Your compliance" side-by-side metrics with combined risk calculation |
| Update `app/(internal)/risk-register/page.tsx` | Surface PENDING + IN_PROGRESS responsibility actions alongside findings |
| Add filter toggle to risk register | "Show customer responsibility items" checkbox or tab |
| Dashboard widget | "Your overall responsibility posture" stat card (optional, can defer to a follow-up phase) |

**Gate:**
- [ ] Vendor compliance tab shows both metrics when shared controls exist for that vendor
- [ ] Combined risk posture updates when actions are completed
- [ ] Risk register shows responsibility actions with vendor, control code, status, assignee
- [ ] Risk register filter toggles between findings-only and findings + responsibility actions
- [ ] No regression on vendors without shared-responsibility controls
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` clean

**Effort:** ~1 day

---

### Phase 7 — Tests & polish

**What it delivers:** Full test coverage, empty states, loading states, edge-case handling.

| Task | Detail |
|---|---|
| Unit tests for `lib/db/customer-responsibility.ts` | `upsertActionsForCertification`, `updateAction`, `listActionsByVendor`, `getCompliance`, `matchFrameworkForCertification` |
| Integration tests for server actions | Auto-generation on cert save, status transitions, evidence upload, cert deletion |
| Unit tests for edge cases | Duplicate cert save, cert with no matching framework, framework with zero shared controls, vendor with no certs |
| Playwright e2e | Full flow: admin marks a control as shared → add cert → checklist appears → complete an action → verify score updates |
| Empty states | No certs, cert with no shared controls, all actions completed |
| Loading states | Skeleton for checklist loading |
| Polish | Consistent badge colors, progress bar animation, responsive layout |

**Gate:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Playwright e2e passes against production build
- [ ] Empty states render cleanly
- [ ] No unhandled edge cases
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` clean
- [ ] `npm run test` passes

**Effort:** ~1 day

---

## Summary

| Phase | Deliverable | Effort |
|---|---|---|
| 1 | Schema + seed | 0.5 day |
| 2 | Auto-generation on cert save | 0.5 day |
| 3 | Read-only checklist UI | 1 day |
| 4 | Checklist interactivity | 1.5 days |
| 5 | Controls management UI (shared checkbox) | 0.5 day |
| 6 | Scoring + risk register integration | 1 day |
| 7 | Tests + polish | 1 day |
| **Total** | | **~6 days** |

Each phase is independently shippable. You can stop after Phase 3 and have a useful read-only checklist, ship Phase 4 to let teams start tracking items, and add Phase 5 when you're ready to support frameworks beyond SOC 2.

---

## File manifest

| File | Action | Phase |
|---|---|---|
| `prisma/schema.prisma` | Edit | 1 |
| `prisma/migrations/` | New | 1 |
| `prisma/seed.ts` | Edit | 1 |
| `prisma/seed-data/soc2.ts` | Edit | 1 |
| `lib/db/customer-responsibility.ts` | New | 1-2, 4, 6 |
| `lib/actions/customer-responsibility.ts` | New | 4, 5 |
| `lib/actions/certifications.ts` | Edit | 2 |
| `lib/schemas/certification.ts` | Edit | 2 |
| `components/customer-responsibility-manager.tsx` | New | 3 |
| `components/customer-responsibility-checklist.tsx` | New | 3-4 |
| `app/(internal)/vendors/[vendorId]/page.tsx` | Edit | 3, 6 |
| `app/(internal)/frameworks/[frameworkId]/page.tsx` | Edit | 5 |
| `app/(internal)/frameworks/[frameworkId]/controls/[controlId]/page.tsx` | Edit | 5 |
| `lib/db/frameworks.ts` | Edit | 5 |
| `lib/db/compliance.ts` | Edit | 6 |
| `app/(internal)/risk-register/page.tsx` | Edit | 6 |
| `lib/permissions.ts` | Edit | 4-5 |

### RBAC

| Action | Permission |
|---|---|
| View customer responsibility checklist | `VENDORS_VIEW` (existing) |
| Update status, assign, add notes, upload evidence | `VENDORS_EDIT` (existing) |
| Mark controls as shared responsibility | `FRAMEWORKS_EDIT` (existing) |

No new permissions needed.

### Seed data

SOC 2 shared-responsibility controls (based on AICPA Trust Services Criteria published shared-responsibility matrix):

| Code | Control |
|---|---|
| CC6.1 | Logical and physical access controls |
| CC6.2 | User access provisioning and review |
| CC6.3 | Security incident response |
| CC6.4 | Security monitoring and detection |
| CC6.6 | External boundary protection (your network) |
| CC6.7 | Data transmission encryption |
| CC7.1 | Data classification and labeling |
| CC7.2 | Data retention and disposal |
| CC8.1 | Change management for your systems |
| CC9.1 | Risk assessment process |
| CC9.2 | Vendor risk management (for your other vendors) |
| PI1.3 | Privacy notice and consent collection |
| PI1.4 | Individual data access and correction rights |

### Scoring impact

The vendor compliance tab splits into two metrics when shared-responsibility controls exist:

```
┌──────────────────┐  ┌──────────────────┐
│ Vendor compliance│  │ Your compliance  │
│                  │  │                  │
│     94%          │  │      67%         │
│  (answers +      │  │  (your completed ÷
│   review)        │  │   total shared)  │
└──────────────────┘  └──────────────────┘

Combined risk posture: 81%
```

Combined risk is a weighted average (configurable in Scoring settings, default 50/50 split). When a vendor has no shared-responsibility controls, only the vendor compliance score is shown (no change from current behavior).

### Customer responsibility on risk register

Pending and In Progress actions surface in the risk register alongside findings, with a dedicated filter toggle. Each entry shows:

- Vendor name → link to vendor detail
- Control code + title
- Status badge (colored)
- Assigned to
- Days since certification was recorded (aging)

### Dependencies

None. Everything reuses existing infrastructure:

- **Attachment** model for evidence (`entityType = "CustomerResponsibilityAction"`)
- **`/api/attachments/[attachmentId]`** for serving
- **VendorCertification** for linking
- **Control** for control definitions
- **Framework** for framework matching
- **User** for assignment
- **AuditLog** for audit trail

### Out of scope

- Custom per-certification shared responsibility matrices (v1 is framework-driven)
- Email reminders for overdue actions (future cron enhancement)
- API endpoints for responsibility actions (server actions only in v1)
- Integration with external GRC systems
- Retroactive generation of actions when a control is newly marked as shared (requires re-saving the certification)
- Org-wide "customer responsibility policy" settings
