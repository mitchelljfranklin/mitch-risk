# Configuration Overview

All operational settings in Mitch‑Risk are managed through the in-app **Admin** area (the gear icon in the header). There are no YAML config files, no environment variables to tweak after deployment, and no manual database edits required. Every option is configurable via the UI by users with the relevant admin permission.

The Admin area is organised into seven groups and sixteen sections. Each section lives on its own page, and the sidebar shows only the sections your role can access:

- **Workspace** — General, Appearance
- **Email** — Email (SMTP + templates), Email tracking
- **Assessments** — Scoring, Scheduling
- **Files** — Storage (backend + upload constraints)
- **Access & security** — Users, Roles, Sign-in (SSO + sessions), Rate limits
- **Integrations** — API, Webhooks
- **Platform** — Trust Center, Audit log, Health

---

## Trust Center

Configure and enable the public trust center page at `/trust` — see the [Trust Center guide](/user-guides/trust-center). Content itself (badges, documents, subprocessors, sections) is curated under **Manage → Trust center**.

| Setting | Description |
|---------|-------------|
| **Enable the trust center** | Master switch — while off, `/trust` shows a not-found message |
| **Intro (markdown)** | Short paragraph under the organisation name on the public page |
| **Contact email** | Shown at the foot of the public page; falls back to the support email |
| **Link in invite emails** | Adds a trust-center footer to vendor invite emails at send time |
| **Page loads / downloads per min** | Per-IP rate limits for the public page and document downloads |

---

## General

Configure your organisation's identity.

| Setting | Description |
|---------|-------------|
| **Organisation name** | Displayed in the sidebar, login screen, email signatures, PDF reports, and browser tab titles |
| **Support email** | Shown in email footers and the footer of every page for user-facing support contact |

---

## Appearance

Customise the platform's visual identity to match your brand.

| Setting | Description |
|---------|-------------|
| **Primary colour** | Used for buttons, links, active navigation, and focus rings |
| **Secondary colour** | Used for hover states, accents, and secondary UI elements |
| **Logo** | Upload a custom logo (PNG, JPG, GIF, or WEBP). Displayed in the sidebar and on the login screen. SVG is not accepted for security reasons |
| **RAG green** | Colour for green (compliant) scores and indicators |
| **RAG amber** | Colour for amber (needs attention) scores and indicators |
| **RAG red** | Colour for red (non-compliant) scores and indicators |
| **RAG unscored** | Colour for unscored assessments |
| **Border radius** | Controls the roundness of cards, buttons, and inputs (0–16px) |
| **Page width** | `Constrained` (centred, max-width) or `Full` (stretches to browser width) |

See [Appearance](./appearance) for full details.

---

## Email

Configure SMTP delivery and customise all email templates.

| Section | Description |
|---------|-------------|
| **SMTP server** | Host, port, username, password, and sender details (from name and address) |
| **Email templates** | 8 template types with customisable subject lines and body content. Body written in Markdown with a WYSIWYG editor — converted to styled HTML when sent. Supports `{{tokens}}` |

See [Email Configuration](./email) for template token reference and SMTP setup.

---

## Email Tracking

A read-only log of every email sent by the platform. Filter by status (SENT/FAILED), type (invite/reminder/escalation/etc.), recipient, or date range. Click **Clear** to reset all active filters. Failed sends can be retried. The **email log retention** policy (how long send records are kept) is configured on this page. Requires **Settings: manage** permission.

---

## Scoring

Configure how vendor responses are scored and how findings are generated.

| Setting | Description |
|---------|-------------|
| **Risk weights** | Point values for CRITICAL, HIGH, MEDIUM, and LOW question weights |
| **RAG thresholds** | Score boundaries for amber (below green threshold) and green (at or above) |
| **Exclude N/A** | When enabled, "Not Applicable" answers are excluded from score calculations |

See [Scoring Configuration](./scoring) for examples and formula details.

---

## Scheduling

Configure assessment deadlines, reminders, and escalation behaviour.

| Setting | Default | Description |
|---------|---------|-------------|
| **Default due in days** | 21 | Default deadline for new assessments (can be overridden per assessment) |
| **Reminder offsets** | 7, 1 | Days before the due date to send automatic reminder emails. Add multiple values (e.g. `7, 3, 1`) |
| **Escalation after days** | 3 | Days past the due date before an escalation email is sent to the support address |

---

## Storage

Configure where evidence files and attachments are stored, and what vendors can upload.

| Setting | Description |
|---------|-------------|
| **Provider** | Local disk (default), AWS S3, or Azure Blob Storage |
| **S3 settings** | Bucket name, region, access key ID, and secret access key |
| **Azure settings** | Connection string and container name |
| **Max upload size** | Maximum allowed file upload size (default 20 MB) |
| **Allowed extensions** | File extensions permitted for evidence upload (default pdf, png, jpg, jpeg, docx, xlsx) |

See [Cloud Storage](../deployment/cloud-storage) for detailed setup instructions per provider.

---

## Sign-in

Configure how staff authenticate and how long they stay signed in.

| Setting | Description |
|---------|-------------|
| **Provider toggles** | Enable/disable Microsoft Entra ID, Google Workspace, and generic OIDC independently |
| **Client credentials** | Client ID and secret for each provider (secrets encrypted at rest) |
| **Auto-provision role** | Role assigned to users created on first SSO sign-in |
| **Allowed domain** | Restrict SSO to a specific email domain (e.g. `@company.com`) |
| **Disable local auth** | Hide the email/password login form when SSO is available |
| **Break-glass URL** | Generate a 24-hour, single-use emergency login URL |
| **Login rate limit** | Maximum login attempts per IP per minute (default 10/min) |
| **Session timeout** | Inactivity timer before auto-sign-out (default 30 min, 0 = disabled). Enforced via client-side countdown + server-side JWT expiry |

See [SSO Configuration](./sso) for per-provider setup guides.

---

## Rate limits

Abuse protection for the public vendor portal and account recovery.

| Setting | Default | Description |
|---------|---------|-------------|
| **Portal page loads** | 30/min | Maximum portal questionnaire page loads per IP per minute |
| **Portal uploads** | 10/min | Maximum file uploads per IP per minute on the portal |
| **Portal submissions** | 5/min | Maximum questionnaire submissions per IP per minute |
| **Portal comments** | 10/min | Maximum comments a vendor can post per link per minute |
| **Password attempts** | 5/min | Maximum portal password attempts per token per minute |
| **Password resets** | 1/min | Maximum password reset requests per IP per minute |
| **Break-glass attempts** | 10/min | Maximum break-glass login attempts per IP per minute |

---

## Users

Manage staff accounts. Create users with email, password (minimum 12 characters), and role assignment. Disable, enable, change roles, reset passwords, and delete users. Before deleting, a summary of affected relations (vendors, assessments, findings, API keys) is shown. Requires **Users: manage** permission.

---

## Roles

Manage custom roles. Three system roles are built in. Create custom roles with any combination of the 24 fine-grained `resource:action` permissions. Roles can be duplicated, edited, and deleted. Requires **Roles: manage** permission.

See [RBAC & Roles](../user-guides/rbac) for the permission catalog and default role definitions.

---

## API

Manage API keys for programmatic access.

| Feature | Description |
|---------|-------------|
| **Enable API** | Global toggle to enable or disable all API access |
| **Create key** | Generate API keys with optional expiry (30/90/180/365 days or permanent) |
| **IP allowlisting** | Restrict keys to specific IPv4/IPv6 addresses or CIDR ranges |
| **Permission scoping** | Restrict keys to specific permission groups (e.g., read-only audit key) or grant full access |
| **Revoke** | Instantly disable a key without deleting it |
| **Audit** | All key lifecycle events (create, revoke, enable, delete) are logged |

API authentication supports Bearer tokens and session cookies. Full interactive documentation is available at `/docs`.

---

## Audit log

A read-only, paginated log of all administrative actions. Filter by action type, user, or date range. Click **Clear** to reset all active filters. Export to CSV (all results or current page). 57 distinct action types are tracked including logins, user management, vendor CRUD, assessment lifecycle, template operations, and settings changes. The **audit retention** policy (how long entries are kept) is configured on this page. Requires **Audit: view** permission.

---

## Webhooks

Configure outbound HTTP callbacks that fire when key events occur. Each endpoint gets a unique signing secret for HMAC-SHA256 payload verification. Platform presets (Slack, Microsoft Teams, Discord) auto-format messages for direct delivery — no middleware needed.

| Feature | Description |
|---------|-------------|
| **URL** | The HTTPS endpoint that receives POST requests with JSON payloads |
| **Platform** | Preset message format: Generic (HTTP with HMAC), Slack (Block Kit), Microsoft Teams (Adaptive Card), or Discord (Embed) |
| **Events** | Assessment submitted, assessment overdue, finding created, finding resolved, certification expiring |
| **Enable/Disable** | Toggle endpoints on or off without deleting |
| **Secret** | Randomly generated per-endpoint signing secret |

Requires **Webhooks: manage** permission (Admin by default).

---

## Health

System diagnostics for operators. Shows the current application status. The **Database** section shows whether the connection is healthy. Requires **Settings: manage** permission.
