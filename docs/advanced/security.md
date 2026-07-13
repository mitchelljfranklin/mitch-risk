# Security

## Authentication methods

Mitch‑Risk supports two authentication paths for internal staff:

### Email / password

- Passwords hashed with **bcryptjs** (12 rounds)
- 12 character minimum enforced at creation
- Password reset: SHA-256 hashed tokens, 1-hour expiry, single-use, rate-limited

### SSO (Single Sign-On)

- **Microsoft Entra ID**, **Google Workspace**, **Custom OIDC** (Auth0, Keycloak, etc.)
- Auto-provisioned users get no local password (prevents bypass)
- Domain restriction optional
- See [SSO Configuration](../configuration/sso) for setup

## Break-glass access

When SSO-only mode is enabled (local login hidden), a **break-glass URL** provides emergency access:

1. Generate under **Settings → SSO → Break-glass**
2. URL format: `/login?break-glass=<token>`
3. Token is bcrypt-hashed and stored as a JSON object with a consumed flag (not stored plaintext)
4. Tokens expire 24 hours after generation and are single-use
5. Opens the local login form; rate-limited to 10/min per IP
6. Regenerate to issue a new URL

## Session security

| Property | Value |
|---|---|
| Session type | Stateless JWT (Auth.js v5) |
| Cookie flags | `httpOnly`, `secure` (production), `sameSite: lax` |
| Signing secret | `AUTH_SECRET` env var (validated at boot) |
| Client-side idle timeout | Configurable (default 30 min). A 60s countdown warns before forced sign-out. The server also enforces session expiry via a sliding-window JWT `exp` claim, refreshed on every request — the session is invalidated regardless of client-side activity after the configured timeout |

## API security

- **API keys** format: `mrk_<8-hex-prefix>.<48-hex-secret>`
- Keys are bcrypt-hashed in the database; prefix enables indexed lookup without full table scan
- IP allowlisting via CIDR (empty = all IPs allowed)
- Configurable expiry (30/90/180/365 days or permanent)
- Per-key permission scoping — restrict keys to specific permission groups (e.g., read-only audit key) or grant full access
- API key auth must be enabled globally under **Settings → API**

## Portal token security

- Vendor questionnaire links use 43-character base64url tokens (256-bit random)
- Tokens hashed with SHA-256 for database storage
- Expiry configurable (default 30 days), server-enforced
- Optional bcrypt-hashed portal password for additional protection

## Encryption at rest

- **SMTP password**, **SSO client secrets**, **cloud storage credentials** encrypted with AES-256-GCM
- Key derived from `APP_ENCRYPTION_KEY` env var (minimum 32 characters)
- If the encryption key is rotated, old values become undecryptable — the affected feature stops working with a warning logged, but the app doesn't crash

## Content Security Policy

The app uses a nonce-based `strict-dynamic` CSP:

```
script-src 'self' 'nonce-<uuid>' 'strict-dynamic'
style-src 'self' 'unsafe-inline'
object-src 'none'
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
```

Additional headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

CSP violation reports are sent to `/api/csp-report` in production (logged to server console).

## File upload security

- Dangerous MIME types rejected via deny-list (HTML, JS, SVG, PHP, executables, shell scripts)
- Configurable max upload size (default 20 MB)
- Configurable allowed extensions (default: pdf, png, jpg, jpeg, docx, xlsx)
- Magic-byte (file signature) validation detects renamed files
- Content-Disposition headers URI-encoded to prevent header injection
- Files served through authenticated routes — never via raw public URLs
