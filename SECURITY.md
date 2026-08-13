# Security Policy

## Supported versions

Mitch‑Risk is self‑hosted software. Only the latest release on the `master`
branch receives security patches. We do not backport fixes to older tags.

| Version   | Supported          |
| --------- | ------------------ |
| 1.2.x     | :white_check_mark: |
| `master`  | :white_check_mark: |
| < 1.2     | :x:                |

## Reporting a vulnerability

**Do not open a public issue.** Instead, email a detailed report to
**security@mitchrisk.com** (or the maintainer's contact listed in the
repository). Include:

- Steps to reproduce
- Affected version / commit hash
- Potential impact
- Any suggested fix (optional)

We will acknowledge receipt within **72 hours** and aim to publish a fix
within **14 days**, depending on severity. We will credit the reporter
unless you request anonymity.

### What qualifies

- Authentication bypass or privilege escalation
- Injection (SQL, NoSQL, command, template)
- Insecure direct object reference exposing vendor data
- Cryptographic weakness (predictable token, missing auth‑tag check)
- File‑path traversal in evidence storage or attachment serving
- Cross‑site scripting via stored content (questionnaire text, vendor
  answers, evidence filenames)
- Server‑side request forgery via user‑supplied URLs
- Exposure of encrypted secrets (`APP_ENCRYPTION_KEY`, SMTP password,
  OIDC client secrets)

### What does not qualify

- Missing HTTP security headers already covered by the reverse‑proxy
  deploy model (HSTS, X‑Frame‑Options — these belong on the proxy, not
  the app)
- Clickjacking on the vendor portal (the portal has no authenticated
  session — a stolen opaque token is the attack, not clickjacking)
- Self‑XSS (paste‑into‑console attacks)
- Denial‑of‑service via unbounded file upload — rate limiting is
  in‑memory and sized for a single‑container deployment; horizontal
  scaling requires a shared store (Redis), which is documented
- Brute‑force on a single API key — the key has 192 bits of entropy;
  the attack is infeasible

---

## Security model

### Authentication

**Internal staff** authenticate via Auth.js (NextAuth v5) using
credentials bound to a database‑backed `User` record. Passwords are
hashed with bcryptjs (12 rounds). Sessions use encrypted JWTs stored in
an HTTP‑only, Secure, SameSite=Lax cookie, with a configurable
sliding‑window expiry.

**API access** uses Bearer tokens (`mrk_<prefix>.<secret>`):
- The `mrk_` prefix is extracted for a database index lookup; the full
  key is verified with bcryptjs against the stored hash.
- API keys are scoped to a permission subset and can be restricted by
  IP allowlist (single IP or CIDR notation, IPv4 + IPv6).
- Each key has an optional expiry date.
- An in‑app toggle disables the entire API surface.
- Request count per key is tracked and surfaced in Settings for
  operational monitoring.

**Vendor portal** access uses opaque, cryptographically random tokens
stored in the `Assessment` record. Tokens have a configurable expiry and
can be revoked, regenerated, or extended by internal staff. No login
or session is created — the token alone gates access.

### Authorization (RBAC)

Every action is gated by `resource:action` permission keys. Three
system roles ship by default — Admin (all permissions), Reviewer (write
+ review), Viewer (read‑only) — and custom roles can be created with any
subset of permissions.

- Server‑side: `requirePermission()` on every action, route handler, and
  page.
- Client‑side: controls that trigger a gated action are **hidden** (not
  disabled) when the user lacks the permission.
- Navigation: sidebar items and settings tabs are filtered to the user's
  allowed set.

### Encryption at rest

Secrets stored in the database (SMTP password, SSO/OIDC client secrets,
S3 secret access key, Azure Blob connection string) are encrypted with
**AES‑256‑GCM**:
- The key is derived from `APP_ENCRYPTION_KEY` via SHA‑256.
- Each encryption uses a random 12‑byte IV.
- The auth tag is verified on decryption — tampered ciphertext is
  rejected.
- Encrypted values are never returned to the client.

### Rate limiting

An in‑memory fixed‑window rate limiter (`lib/rate-limit.ts`) protects:
- Login and break‑glass emergency access
- Password reset requests
- Vendor portal: page loads, autosave, file uploads, and submission
- API key authentication (per IP and per key)
- Cron endpoint (requires `CRON_SECRET` header)

The limiter is per‑process and correct for the single‑container Docker
Compose deployment. If scaled horizontally, a shared store (Redis) is
required — this is documented in the deployment guide.

### Evidence file storage

Files are stored behind a pluggable `FileStorage` interface supporting
local disk, AWS S3, and Azure Blob. The active provider is configured
in‑app via Settings. Storage credentials are encrypted at rest.

Key security properties:
- **Path‑traversal guard:** `resolveKeyPath()` rejects keys that resolve
  outside the configured storage root via canonical‑path prefix check.
- **No public URLs:** files are served only through an authenticated
  Next.js route (`/api/attachments/[attachmentId]`).
- **Cleanup on delete:** deleting a record removes its associated
  storage files. An orphaned‑file sweep in the cron job is the backstop.
- **MIME validation:** uploads are validated against an allowlist of
  permitted types.

### Portal tokens

Vendor portal tokens are generated with `crypto.randomBytes` (Node.js
CSPRNG), stored as a SHA‑256 hash in the database. The raw token is
emailed to the vendor. Validation is constant‑time (`timingSafeEqual`).

### Cron endpoint

`POST /api/cron/run` requires the `CRON_SECRET` header. The secret is
compared in constant time. The application **refuses to boot in
production without `CRON_SECRET`** (except during `next build`). Only
the system cron scheduler should call this endpoint.

### Content Security Policy

A strict‑dynamic CSP with nonce is applied via `proxy.ts` (Next.js 16
replacement for middleware) to all document GET requests. The nonce is
per‑request, thread‑safe, and plumbed through the React server
rendering pipeline. No inline `<script>` exists without the nonce.

---

## Deployment security checklist

1. **Set `CRON_SECRET`** to a 64‑character random string.
2. **Set `APP_ENCRYPTION_KEY`** to a 32‑character random string —
   this protects all secrets stored in the database.
3. **Set `AUTH_SECRET`** to at least 32 characters (64+ recommended) for JWT
   signing.
4. **Configure `TRUSTED_PROXY_COUNT`** to match your reverse‑proxy
   hop count (default `0` = X‑Forwarded‑For ignored). Incorrect
   configuration breaks client‑IP rate limiting and API‑key IP
   allowlists.
5. **Run behind a reverse proxy** (Caddy/nginx) that handles TLS
   termination, HSTS, and X‑Frame‑Options.
6. **Rotate secrets on a schedule.** All three secrets
   (`CRON_SECRET`, `APP_ENCRYPTION_KEY`, `AUTH_SECRET`) can be rotated
   with a short maintenance window. See `docs/deployment/docker.md` for
   the safe rotation procedure.
7. **Do not expose port 3000** directly to the internet.
8. **Review the cron schedule** — the cron endpoint performs
   idempotent operations but should not be callable from outside.
