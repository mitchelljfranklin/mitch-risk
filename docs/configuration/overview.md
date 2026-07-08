# Configuration Overview

All operational settings in Mitch‑Risk are managed through the in-app **Settings** page. There are no YAML config files, no environment variables to tweak after deployment, and no manual database edits required. Every option is configurable via the UI by users with the **Settings: manage** permission.

The Settings page is organised into 13 tabs. Eight are configuration forms, three are management screens (Users, Roles, API), and two are read-only log viewers.

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
| **Logo** | Upload a custom logo (PNG, SVG, or JPEG). Displayed in the sidebar and on the login screen |
| **RAG green** | Colour for green (compliant) scores and indicators |
| **RAG amber** | Colour for amber (needs attention) scores and indicators |
| **RAG red** | Colour for red (non-compliant) scores and indicators |
| **RAG unscored** | Colour for unscored assessments |
| **Border radius** | Controls the roundness of cards, buttons, and inputs (0–16px) |
| **Page width** | `Constrained` (centred, max-width) or `Full` (stretches to browser width) |

See [Appearance](configuration/appearance.md) for full details.

---

## Email

Configure SMTP delivery and customise all email templates.

| Section | Description |
|---------|-------------|
| **SMTP server** | Host, port, username, password, and sender details (from name and address) |
| **Email templates** | 8 template types with customisable subject lines and body content using `{{tokens}}` |

See [Email Configuration](configuration/email.md) for template token reference and SMTP setup.

---

## Email Tracking

A read-only log of every email sent by the platform. Filter by status (SENT/FAILED), type (invite/reminder/escalation/etc.), recipient, or date range. Failed sends can be retried. Requires **Settings: manage** permission.

---

## Scoring

Configure how vendor responses are scored and how findings are generated.

| Setting | Description |
|---------|-------------|
| **Risk weights** | Point values for CRITICAL, HIGH, MEDIUM, and LOW question weights |
| **RAG thresholds** | Score boundaries for amber (below green threshold) and green (at or above) |
| **Exclude N/A** | When enabled, "Not Applicable" answers are excluded from score calculations |

See [Scoring Configuration](configuration/scoring.md) for examples and formula details.

---

## Scheduling

Configure assessment deadlines, reminders, and escalation behaviour.

| Setting | Default | Description |
|---------|---------|-------------|
| **Default due in days** | 21 | Default deadline for new assessments (can be overridden per assessment) |
| **Reminder offsets** | 7, 1 | Days before the due date to send automatic reminder emails. Add multiple values (e.g. `7, 3, 1`) |
| **Escalation after days** | 3 | Days past the due date before an escalation email is sent to the support address |

---

## Limits

Configure rate limits, session behaviour, file restrictions, and data retention.

| Setting | Default | Description |
|---------|---------|-------------|
| **Login rate limit** | 10/min | Maximum login attempts per IP per minute |
| **Session timeout** | 30 min | Inactivity timer before auto-sign-out (0 = disabled) |
| **Portal page loads** | 30/min | Maximum portal questionnaire page loads per IP per minute |
| **Portal uploads** | 10/min | Maximum file uploads per IP per minute on the portal |
| **Portal submissions** | 5/min | Maximum questionnaire submissions per IP per minute |
| **Password attempts** | 5/min | Maximum portal password attempts per token per minute |
| **Password resets** | 1/min | Maximum password reset requests per IP per minute |
| **Break-glass attempts** | 10/min | Maximum break-glass login attempts per IP per minute |
| **Audit retention days** | 0 | Days to retain audit log entries (0 = never prune) |
| **Email log retention** | 14 | Days to retain email notification logs |
| **Max upload size** | 20 MB | Maximum allowed file upload size |
| **Allowed extensions** | pdf, png, jpg, jpeg, docx, xlsx | File extensions permitted for upload |

---

## Storage

Configure where evidence files and attachments are stored.

| Setting | Description |
|---------|-------------|
| **Provider** | Local disk (default), AWS S3, or Azure Blob Storage |
| **S3 settings** | Bucket name, region, access key ID, and secret access key |
| **Azure settings** | Connection string and container name |

See [Cloud Storage](deployment/cloud-storage.md) for detailed setup instructions per provider.

---

## SSO

Configure Single Sign-On for internal staff via Microsoft Entra ID, Google Workspace, or any generic OIDC provider.

| Setting | Description |
|---------|-------------|
| **Provider toggles** | Enable/disable each provider independently |
| **Client credentials** | Client ID and secret for each provider (secrets encrypted at rest) |
| **Auto-provision role** | Role assigned to users created on first SSO sign-in |
| **Allowed domain** | Restrict SSO to a specific email domain (e.g. `@company.com`) |
| **Disable local auth** | Hide the email/password login form when SSO is available |
| **Break-glass URL** | Generate a 24-hour, single-use emergency login URL |

See [SSO Configuration](configuration/sso.md) for per-provider setup guides.

---

## Users

Manage staff accounts. Create users with email, password (minimum 12 characters), and role assignment. Disable, enable, change roles, reset passwords, and delete users. Before deleting, a summary of affected relations (vendors, assessments, findings, API keys) is shown. Requires **Users: manage** permission.

---

## Roles

Manage custom roles. Three system roles are built in. Create custom roles with any combination of the 20 fine-grained `resource:action` permissions. Roles can be duplicated, edited, and deleted. Requires **Roles: manage** permission.

See [RBAC & Roles](user-guides/rbac.md) for the permission catalog and default role definitions.

---

## API

Manage API keys for programmatic access.

| Feature | Description |
|---------|-------------|
| **Enable API** | Global toggle to enable or disable all API access |
| **Create key** | Generate API keys with optional expiry (30/90/180/365 days or permanent) |
| **IP allowlisting** | Restrict keys to specific IPv4/IPv6 addresses or CIDR ranges |
| **Revoke** | Instantly disable a key without deleting it |
| **Audit** | All key lifecycle events (create, revoke, enable, delete) are logged |

API authentication supports Bearer tokens and session cookies. Full interactive documentation is available at `/docs`.

---

## Audit

A read-only, paginated log of all administrative actions. Filter by action type, user, or date range. Export to CSV. 44 distinct action types are tracked including logins, user management, vendor CRUD, assessment lifecycle, template operations, and settings changes. Requires **Audit: view** permission.
