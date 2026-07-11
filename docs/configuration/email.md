# Email Configuration

Mitch‑Risk sends email notifications (assessment invitations, reminders, escalations, password resets) via **Nodemailer over SMTP**. Any standard SMTP relay works — SendGrid, Mailgun, AWS SES, or your organisation's mail server.

Configuration is in-app under **Settings → Email** (requires **Settings: manage** permission).

## Setup

1. Go to **Settings → Email**
2. Enter your SMTP credentials:
   - **SMTP Host** — your relay's hostname (e.g. `smtp.sendgrid.net`)
   - **SMTP Port** — typically 587 (TLS) or 465 (SSL). Defaults to 587
   - **SMTP User** — authentication username
   - **SMTP Password** — password or API key (encrypted at rest with AES-256-GCM)
   - **From Address** — email address that sends notifications
   - **From Name** — display name (e.g. "Mitch‑Risk")
3. Click **Test SMTP** to verify the connection
4. Click **Save**

## Email templates

All email subjects and bodies are customisable under **Settings → Email → Templates**. The body editor is a WYSIWYG Markdown editor with a live preview. When an email is sent, the Markdown body is automatically converted to styled HTML — vendors and reviewers receive properly formatted emails. Tokens work in both subjects and bodies:

```
{{vendorName}}, {{assessmentTitle}}, {{portalUrl}}, {{dueDate}},
{{reviewerName}}, {{assessmentUrl}}, {{message}}, {{appName}},
{{resetUrl}}, {{expiresIn}}, {{expiresDate}}, {{itemName}}, {{vendorUrl}},
{{portalPassword}}
```

| Template type | Trigger |
|---|---|
| **Invite** | Assessment sent to vendor |
| **Invite (password)** | Password-protected assessment sent |
| **Reminder** | Cron: due in N days (configurable offsets) |
| **Escalation** | Cron: overdue beyond threshold |
| **Submission** | Vendor submits assessment |
| **Clarification** | Reviewer requests more info from vendor |
| **Reset** | Staff user requests password reset |
| **Expiry** | Cron: certification or contract expiring |

## Email logging

Every sent email creates a log entry with type, recipient, subject, and status (SENT / FAILED). Failed sends include the error message. View logs under **Settings → Email Tracking**.

Logs are pruned automatically by the cron job (default: 14 day retention, configurable under Settings → Limits).

## Provider examples

**SendGrid:**
```
SMTP Host: smtp.sendgrid.net
Port: 587
User: apikey
Password: SG.your-sendgrid-api-key
```

**Mailgun:**
```
SMTP Host: smtp.mailgun.org
Port: 587
User: postmaster@yourdomain.com
Password: your-mailgun-smtp-password
```

**AWS SES:**
```
Port: 587
Use STARTTLS. Requires IAM credentials with ses:SendRawEmail permission.
```

## Security

- SMTP password is AES-256-GCM encrypted in the database — never returned to the client
- The password field shows only whether a password is configured (boolean), not the actual value
- If `APP_ENCRYPTION_KEY` is rotated, the old password becomes undecryptable and SMTP silently stops working (logged with a warning, doesn't crash the app)
