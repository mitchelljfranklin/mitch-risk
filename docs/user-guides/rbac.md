# RBAC & Roles

mitch-risk uses **permission-based** access control, not "is authenticated" gating. Three system roles are built in, and admins can create custom roles with any combination of the 20 fine-grained permissions.

## Permission Catalog (20 Permissions)

### Vendors (4)

| Permission Key | Description |
|---------------|-------------|
| `vendors:view` | View vendor list and vendor detail pages |
| `vendors:create` | Create new vendors (including CSV import) |
| `vendors:edit` | Edit vendor profiles, certifications, and attachments |
| `vendors:delete` | Delete vendors (cascades to assessments and files) |

### Assessments (5)

| Permission Key | Description |
|---------------|-------------|
| `assessments:view` | View assessment list and assessment detail |
| `assessments:create` | Create and send assessments to vendors |
| `assessments:edit` | Edit assessment settings, manage tokens and links |
| `assessments:review` | Review responses, approve/clarify, finalize assessments |
| `assessments:delete` | Delete assessments (cascades to files) |

### Templates (4)

| Permission Key | Description |
|---------------|-------------|
| `templates:view` | View template list and template detail |
| `templates:create` | Create new templates |
| `templates:edit` | Edit templates, publish/unpublish, version |
| `templates:delete` | Delete templates |

### Frameworks (2)

| Permission Key | Description |
|---------------|-------------|
| `frameworks:view` | View framework list and framework detail with controls |
| `frameworks:edit` | Import and edit frameworks |

### Administration (5)

| Permission Key | Description |
|---------------|-------------|
| `audit:view` | View audit log and email notification log |
| `users:manage` | Create, disable, enable, delete users; change roles |
| `roles:manage` | Create, edit, delete, duplicate roles |
| `settings:manage` | Manage all in-app settings (email, scoring, branding, storage, etc.) |
| `api:manage` | Create, revoke, enable, delete API keys |

## Default System Roles

| Role | Permissions | Who It's For |
|------|:----------:|--------------|
| **Admin** | 20 (all) | Full platform control. Locked — cannot be deleted or edited. |
| **Reviewer** | 15 | Staff who manage vendors and assessments. Cannot manage users, roles, settings, API, or view audit. |
| **Viewer** | 4 | Read-only: `vendors:view`, `assessments:view`, `templates:view`, `frameworks:view` |

System roles are seeded on first run and cannot be deleted. The Admin role cannot be modified.

## Custom Roles

Admins can create custom roles in **Settings → Roles**:

1. Click **Create Role**.
2. Name the role and write a description.
3. Select the permissions to grant.
4. Assign the role to any user.

Custom roles can have any subset of the 20 permissions. Use them to create role profiles like "Auditor" (audit + view only), "Vendor Manager" (vendors + assessments + templates), or "API-only" (just the relevant API permission set).

## Enforcement

Access control is enforced at every layer:

| Layer | Mechanism | Behavior |
|-------|-----------|----------|
| **Page access** | `requirePermission(key)` | Redirects to dashboard if denied |
| **Server actions** | `requirePermission(key)` at start of every action | Returns 403 if denied |
| **API routes** | `authenticateRequest()` + permission check | Returns 403 JSON envelope if denied |
| **UI controls** | `hasPermission(user.permissions, key)` in JSX | Controls are **hidden**, not greyed out |
| **Sidebar nav** | Permission-filtered navigation items | User only sees sections they can access |
| **Settings tabs** | Tab params sanitized against permissions | Hidden tabs cannot be forced via URL |

> **Hide, don't disable.** A role without a permission simply does not see the control. A Viewer gets a clean read-only screen — no write buttons, no redirect-on-click traps.

## Practical Examples

| Action | Admin | Reviewer | Viewer |
|--------|:-----:|:--------:|:------:|
| View vendor list | Yes | Yes | Yes |
| Create/import vendors | Yes | Yes | No |
| Edit vendor profiles | Yes | Yes | No |
| Delete vendors | Yes | Yes | No |
| View assessments | Yes | Yes | Yes |
| Send assessments | Yes | Yes | No |
| Review & finalize | Yes | Yes | No |
| Delete assessments | Yes | Yes | No |
| Create templates | Yes | Yes | No |
| Edit/publish templates | Yes | Yes | No |
| View frameworks | Yes | Yes | Yes |
| Edit/import frameworks | Yes | Yes | No |
| View audit log | Yes | No | No |
| Manage users | Yes | No | No |
| Manage roles | Yes | No | No |
| Manage settings | Yes | No | No |
| Manage API keys | Yes | No | No |
