# Customer Responsibility Tracking

> **Phase 111** — Track your own obligations when a vendor is SOC 2 / ISO 27001 certified.

---

## Overview (for review)

### The problem

When a vendor is SOC 2 certified, that certification doesn't mean *you* are compliant. SOC 2 (and ISO 27001) define a **shared responsibility model** — some controls are the vendor's job (they secure the platform), and some are *yours* (you enforce MFA for your users, you conduct access reviews, you classify the data you store).

Right now mitch-risk says *"Vendor A is 94% compliant with SOC 2"* — but if 8 of those controls are actually your responsibility and you haven't done them, you're not at 94%. You don't know where you stand.

### What this feature does

When you record a vendor's SOC 2 or ISO 27001 certification, mitch-risk automatically creates a **customer responsibility checklist** — a list of controls the auditor says *you* must implement:

```
┌─────────────────────────────────────────────────────────┐
│ Customer Responsibility (SOC 2 Type II)                  │
│                                                          │
│ These controls are your responsibility under this        │
│ vendor's SOC 2 report.                     [Collapse ▲]  │
│                                                          │
│ Progress: ████████░░░░░░  4 of 12 completed              │
│                                                          │
│ CC6.1   Enforce MFA for all users              [✔ Done] │
│ CC6.2   Conduct quarterly access reviews        [▶ In Progress]│
│ CC7.1   Classify stored data                    [○ Pending]   │
│ CC9.1   Review audit logs monthly               [○ Pending]   │
│ CC9.2   Conduct risk assessments annually       [○ Pending]   │
│                                                          │
│ Your compliance: 33%    ·  Vendor compliance: 94%          │
│ Combined risk posture: 76%                                │
└─────────────────────────────────────────────────────────┘
```

For each item in the checklist you can:

- **Track status** — Pending, In Progress, Completed, or Not Applicable
- **Assign it** to a team member
- **Add notes** and **attach evidence** (screenshots, policy documents, audit records)
- **Mark it done** — and mitch-risk records when and by whom

The checklist then feeds into:

- The **vendor compliance view** — now split into "Vendor compliance" and "Your compliance"
- The **dashboard** — "Your overall responsibility posture" across all vendors
- The **risk register** — unfinished responsibility items surface as gaps
- The **certification expiry reminders** — already covered, reminders still go out

### How it works (user perspective)

1. You add a SOC 2 certification to a vendor (existing flow — cert name, issuer, dates, attachment)
2. mitch-risk detects it's SOC 2 and auto-generates the checklist of ~12 shared-responsibility controls
3. The checklist appears on the vendor detail page below the certification
4. Over time, you update each item as you implement the controls
5. mitch-risk shows your progress alongside the vendor's own compliance score

No questionnaires to fill out. No new pages to learn. It lives inline on the vendor detail page, right next to the certification it relates to.

### What ships pre-loaded

SOC 2 shared-responsibility controls (12 controls across CC6, CC7, CC9) and ISO 27001 customer-side controls are pre-seeded as "shared responsibility" based on published auditor matrices. Admins can adjust which controls are marked shared via the Frameworks settings.

### What this doesn't do (out of scope)

- It doesn't replace the existing questionnaire/assessment/scoring flow — that's still how you assess *vendor* compliance
- It doesn't automatically verify that you've done the control (you self-attest)
- It doesn't integrate with your own internal GRC tool
- It doesn't enforce policy (if you lie about completing CC6.1, mitch-risk can't stop you)
- It doesn't handle custom certifications with custom shared-responsibility matrices (v1 is framework-driven)

---

## Technical Design

### Data model

#### New model

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

#### Addition to Control model

```prisma
model Control {
  // ... existing fields ...
  isSharedResponsibility Boolean @default(false)
}
```

### How auto-generation works

When a certification is saved via `saveCertificationAction()`:

1. The framework is detected by matching `certification.name` against known framework names (`SOC 2`, `ISO 27001`, etc.)
2. Controls from that framework where `isSharedResponsibility = true` are fetched
3. `CustomerResponsibilityAction` rows are upserted — if a row already exists for `(vendorId, certificationId, controlCode)`, it's left untouched (preserving existing status)
4. New controls that weren't in a previous certification get new PENDING rows
5. Existing COMPLETED actions from a prior certification that don't appear in the new one are preserved (if certificationId remains same) or detached (if it's a replacement cert)

If no certification is linked (legacy or custom attestation), auto-generation doesn't fire. Admins can always manually add actions.

### File manifest

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Edit | Add `CustomerResponsibilityAction` model, `CustomerResponsibilityStatus` enum, `isSharedResponsibility` field on Control |
| `prisma/migrations/` | New | Migration |
| `prisma/seed.ts` | Edit | Seed shared-responsibility flags for SOC 2 and ISO 27001 |
| `prisma/seed-data/soc2.ts` | Edit | Add `isSharedResponsibility: true` to shared control entries |
| `prisma/seed-data/iso27001.ts` | Edit | Same for ISO 27001 |
| `lib/schemas/certification.ts` | Edit | Add `CustomerResponsibilityActionInput` zod schema |
| `lib/db/customer-responsibility.ts` | **New** | CRUD: `listActionsByVendor()`, `upsertActions()`, `updateAction()`, `getActionCompliance()` |
| `lib/actions/customer-responsibility.ts` | **New** | Server actions: `updateResponsibilityAction()`, `bulkUpdateActions()` |
| `lib/actions/certifications.ts` | Edit | After saving a certification, auto-generate actions via `upsertActions()` |
| `components/customer-responsibility-checklist.tsx` | **New** | Client component: checklist card with status toggles, notes, evidence, assigned-to |
| `components/customer-responsibility-manager.tsx` | **New** | Server wrapper that fetches actions and renders the checklist for a given vendor |
| `app/(internal)/vendors/[vendorId]/page.tsx` | Edit | Add "Customer Responsibility" section to vendor detail |
| `app/(internal)/risk-register/page.tsx` | Edit | Surface pending responsibility actions alongside findings |
| `lib/db/compliance.ts` | Edit | Add `getCustomerResponsibilityCompliance()` for scoring |
| `lib/permissions.ts` | Edit | Audit log strings: `SET_RESPONSIBILITY_ACTION`, `UPDATE_RESPONSIBILITY_ACTION` |

### RBAC

| Action | Permission |
|---|---|
| View customer responsibility checklist | `VENDORS_VIEW` (existing) |
| Update status, assign, add notes, upload evidence | `VENDORS_EDIT` (existing) |

No new permissions needed.

### Seed data

SOC 2 shared-responsibility controls (based on AICPA Trust Services Criteria — published shared responsibility matrix):

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

The vendor compliance tab splits into two metrics:

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

Combined risk is a weighted average (configurable in Scoring settings, default 50/50 split).

### Customer responsibility on risk register

Pending and In Progress actions surface in `/risk-register` alongside findings, with a filter toggle. Each entry shows:

- Vendor name → link to vendor detail
- Control code + title
- Status badge (colored)
- Assigned to
- Days since certification was recorded (aging)

### Dependencies

None. Everything reuses existing infrastructure:
- **Attachment** model for evidence (entityType = "CustomerResponsibilityAction")
- **`/api/attachments/[attachmentId]`** for serving
- **VendorCertification** for linking
- **Control** for the control definitions
- **User** for assignment
- **AuditLog** for audit trail

### Out of scope

- Custom per-certification shared responsibility matrices (v1 is framework-driven only)
- Email reminders for overdue actions (future cron enhancement)
- API endpoints for responsibility actions (server actions only in v1)
- Integration with external GRC systems
- Org-wide "Customer responsibility policy" settings

---

## Gate checklist

- [ ] Control model gains `isSharedResponsibility` field
- [ ] Migration applies cleanly on fresh database
- [ ] Seed pre-marks SOC 2 and ISO 27001 shared controls
- [ ] Saving a SOC 2 certification auto-generates responsibility actions
- [ ] Saving a non-SOC-2/ISO certification does NOT generate actions
- [ ] Customer responsibility checklist appears on vendor detail (below certifications)
- [ ] Each action can be set to Pending / In Progress / Completed / Not Applicable
- [ ] Actions can be assigned to an internal user
- [ ] Actions accept notes and evidence attachments
- [ ] Vendor compliance tab shows split metrics (vendor + customer)
- [ ] Risk register surfaces pending responsibility actions
- [ ] Deleting a certification preserves actions (SetNull, not cascade)
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` clean
- [ ] `npm run test` passes
- [ ] All new server actions are RBAC-gated
- [ ] UI controls hidden when user lacks `VENDORS_EDIT`
