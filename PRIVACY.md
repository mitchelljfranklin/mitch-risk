# Privacy Policy

Mitch‑Risk is a self‑hosted third‑party vendor risk management
application. **You deploy it on your own infrastructure.** The software
authors do not collect, store, or process any data from your instance.

This document describes what data the software processes, how it is
secured, and what deployers must communicate to their vendors and
users.

---

## What the software processes

### Internal staff data

| Data | Purpose | Source |
|------|---------|--------|
| Name, email | Authentication, notifications | Entered during user creation |
| Hashed password | Credential verification | Set by user or admin |
| Role assignments | Authorization (RBAC) | Set by admin |
| Permission grants | Access control | Set by admin via role |
| Session tokens | Authentication state | Generated on login |
| Audit log entries | Compliance, troubleshooting | Auto‑generated on actions |
| API key metadata (name, prefix hash, permissions, IP allowlist, expiry) | API access control | Set by admin |

### Vendor data

| Data | Purpose | Source |
|------|---------|--------|
| Name, contact info, tier/criticality | Risk management, communication | Entered by internal staff |
| Assessment responses | Risk scoring, compliance | Provided by vendor via portal |
| Uploaded evidence files | Supporting documentation | Provided by vendor via portal |
| Comments (internal + vendor) | Collaboration | Both parties |
| Review decisions | Quality assurance | Internal reviewers |
| Portal access token (hashed) | Secure vendor portal access | Auto‑generated on assessment send |

### Operational configuration

| Data | Purpose |
|------|---------|
| SMTP credentials (encrypted) | Email delivery |
| OIDC/OAuth client secrets (encrypted) | SSO authentication |
| Storage backend credentials (encrypted) | Evidence file storage |
| Branding (logo, name, colour tokens) | White‑labeling |
| Scoring weights, RAG thresholds | Risk calculation |

---

## Data storage and encryption

- **Primary data** is stored in a PostgreSQL database running on your
  infrastructure.
- **Evidence files** are stored on a local disk volume, AWS S3, or
  Azure Blob — configured in‑app.
- **Secrets** (SMTP password, OIDC secrets, storage credentials) are
  encrypted at rest with **AES‑256‑GCM** using your `APP_ENCRYPTION_KEY`.
  The key is never stored in the database.
- **Passwords** are hashed with bcryptjs (12 rounds). Plaintext
  passwords are never stored.
- **API keys** are hashed with bcryptjs (12 rounds). The plaintext key
  is shown once at creation and never stored.
- **Vendor portal tokens** are hashed with SHA‑256. The raw token is
  shown at creation and can be revoked or regenerated.

---

## Data retention and deletion

- **Users:** Deleting a user preserves their audit trail and review
  history via nullable foreign keys (surfaced as "Deleted user").
- **Vendors:** Deleting a vendor removes all associated assessments,
  responses, findings, comments, and evidence files.
- **Evidence files:** Deleting a response or record removes associated
  files from storage. An automated cron sweep removes orphaned files
  as a backstop.
- **API keys:** Deleting a key immediately revokes access. The key
  hash is removed from the database.
- **Audit logs:** Retained indefinitely unless configured otherwise
  via the cron pruning schedule.
- **Email logs:** Retained for the configured retention period;
  pruned by the cron job.

---

## Vendor data handling

Vendors interact with Mitch‑Risk through a secure, no‑login portal:

- **No account creation.** The portal uses an opaque, expiring,
  revocable token in the URL. No cookies, no sessions, no persistent
  state on the vendor's device.
- **Token in URL.** The assessment invitation email contains a link
  with the token. Deployers should warn vendors that anyone with the
  link can access the questionnaire for its lifetime.
- **Evidence files.** Uploaded by vendors via the portal. Served only
  through authenticated routes to internal staff — never via public
  URLs.
- **Comments.** Vendor comments are visible to internal reviewers.
  Internal comments are not visible to vendors.
- **Token revocation.** Internal staff can revoke or regenerate a
  portal token at any time, immediately invalidating the link.

### What deployers must disclose to vendors

If you deploy Mitch‑Risk, you should inform your vendors:

1. You collect questionnaire responses, evidence files, and comments
   through this portal.
2. Data is stored on your infrastructure.
3. The portal link is the sole access mechanism — anyone with the
   link can view the questionnaire.
4. You retain their responses for the duration of your vendor
   relationship and risk management obligations.
5. You will delete their data upon vendor offboarding or on request
   (subject to your legal retention requirements).

---

## Cookies and tracking

### Internal dashboard

| Cookie | Purpose | Type |
|--------|---------|------|
| `authjs.session-token` | Authentication session | HTTP‑only, Secure, SameSite=Lax |
| `authjs.callback-url` | Post‑login redirect | Session |
| `authjs.csrf-token` | CSRF protection | Session |
| `mitch-risk.view-mode` | UI preference (cards/rows) | Persistent, functional only |

### Vendor portal

No cookies are set. No tracking scripts, analytics, or telemetry are
included in either interface.

---

## Third‑party access

Mitch‑Risk itself makes no outbound requests to third‑party services
beyond what the deployer configures:

- **SMTP server:** outbound email delivery (SendGrid, SES, Mailgun, or
  any SMTP‑with‑auth provider). The deployer's SMTP credentials are
  used — the software authors have no access.
- **OIDC/OAuth providers:** optional SSO via Microsoft Entra ID or
  Google Workspace. The deployer's client secrets are encrypted at rest
  and used only for token exchange.
- **S3 / Azure Blob:** optional evidence storage backends. The
  deployer's access credentials are encrypted at rest.

No telemetry, crash reporting, or usage analytics are sent to the
software authors or any third party.

---

## User rights (for the deployer's internal staff)

As the operator of a self‑hosted instance, you are the data controller.
The software provides tools to:

- View, correct, or delete user accounts.
- Export vendor assessments, responses, and findings (CSV, PDF).
- View the full audit log of all actions.
- Configure data retention and pruning schedules.

---

## Breach notification

This is the operator's responsibility. The software provides:

- An audit log of all user actions and system events.
- Database encryption of secrets.
- Guidance for secure deployment (see `SECURITY.md`).

In the event of a database or storage compromise, the operator must
assess exposure based on what was encrypted (secrets), what was hashed
(passwords, tokens), and what was stored in plaintext (vendor names,
responses, evidence files).
