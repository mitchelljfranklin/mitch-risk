# Application Security Overview

## Executive Summary

mitch-risk is a lightweight vendor risk management platform built on Next.js 16 (App Router) with TypeScript, Prisma/PostgreSQL, and Auth.js (NextAuth v5). This document provides a detailed security architecture review for security architects, compliance assessors, and penetration testers evaluating the platform for organisational use.

**Overall security posture:** The platform implements strong security fundamentals for its target scale (single-container, self-hosted deployment). Cryptographic primitives are sound (bcrypt 12 rounds, AES-256-GCM, SHA-256 token hashing, timing-safe comparisons). Input validation is comprehensive via zod. RBAC is granular with UI-level enforcement. The primary hardening opportunities are operational (non-root container user, secrets management in deployment config), not cryptographic or architectural.

---

## 1. Application Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Next.js 16 (App Router) | Full-stack framework — Server Components for reads, Server Actions for writes, React Server Components |
| Database | PostgreSQL 17 via Prisma ORM v6 | Relational data with typed queries, migrations, and idempotent seeding |
| Auth | Auth.js (NextAuth v5 beta) | JWT-based stateless sessions with credentials, SSO (Entra ID, Google, generic OIDC), and first-run admin setup |
| File storage | Local disk (interface-abstracted) | Evidence file storage behind `FileStorage` interface (save/read/delete/list); swappable to S3/MinIO |
| Email | Nodemailer v7 over SMTP | Provider-agnostic email via React Email templates; supports any SMTP relay (SendGrid, Mailgun, etc.) |
| Encryption | AES-256-GCM (Node `crypto`) | Encrypts SMTP password, SSO client secrets at rest in DB; key derived from `APP_ENCRYPTION_KEY` env var |

---

## 2. Authentication & Session Management

### 2.1 Staff Authentication

Internal users authenticate via email/password credentials or Single Sign-On (SSO). Auth.js v5 manages JWT-based sessions with the following properties:

- **Password hashing:** bcryptjs with **12 salt rounds** (`PASSWORD_SALT_ROUNDS`). All password operations (create, verify, reset) use bcrypt constant-time comparison.
- **Password policy:** Minimum 12 characters enforced at creation and reset. The login schema only validates non-empty (min 1 char) — the 12-char floor is a creation-time guarantee; short passwords are rejected by bcrypt hash mismatch at login regardless.
- **Session strategy:** Stateless JWT (`strategy: "jwt"`). No database session table. JWTs are signed with `AUTH_SECRET` (required env var, validated at boot).
- **First-run setup:** When `countUsers() === 0`, the login page redirects to `/setup`. The first admin is created with a 12+ character password. After setup, `/setup` returns 404. This ensures no default admin credentials exist.

**SSO (Single Sign-On):**

The platform supports Microsoft Entra ID (OIDC), Google Workspace (OAuth), and any generic OIDC-compliant IdP. Provider configuration — including enable/disable flags, client IDs, and client secrets — is managed entirely via in-app Settings. No SSO credentials are stored in environment variables or config files. Secrets are encrypted at rest with AES-256-GCM.

Key SSO security features:
- **Conditional provider registration:** `buildSsoProviders()` only registers providers if they are enabled in Settings AND have a configured clientId. Disabled providers expose no OAuth/OIDC callback routes.
- **Domain restriction:** Optional `allowedDomain` setting restricts SSO to a specific email domain (e.g., `@company.com`). Enforced in the `signIn` callback.
- **Auto-provisioning:** First SSO login creates a local user with the configured `autoProvisionRoleId`. Auto-provisioned users get an **empty `passwordHash`**, preventing local-login bypass.
- **SSO-only login + break-glass:** When `disableLocalAuth` is enabled and at least one SSO provider is configured, the local login form is hidden. A single-use break-glass URL (`/login?breakGlass=<token>`) restores the local form for emergency access. Break-glass tokens use 24-byte random hex, bcrypt-hashed in DB, and are rate-limited.

### 2.2 Session Security

| Property | Value | Notes |
|----------|-------|-------|
| Session cookie name | `authjs.session-token` | Auth.js default |
| Cookie flags | `httpOnly`, `secure` (in production), `sameSite: "lax"` | Set by Auth.js |
| Trust host | `trustHost: true` | Required for correct cookie/redirect derivation behind a reverse proxy |
| Callback URL | Derived from `APP_URL` or `AUTH_URL` env var | Override for proxied deployments |
| Session timeout | Not enforced server-side | Client-side idle-timer (`lib/components/idle-timer.tsx`) with configurable countdown; the JWT itself has no `exp` check against `sessionTimeoutMinutes` |

### 2.3 Password Reset Flow

- Token generated via `crypto.randomBytes(24)` → hex string
- Token is **SHA-256 hashed** before storage (not plaintext in DB)
- **1-hour expiry**, single-use (atomically consumed in a transaction)
- `sendResetEmailAction` returns the same generic message for known and unknown emails (no account enumeration)
- SSO-only accounts (empty `passwordHash`) are skipped for reset issuance
- Rate-limited to 1 request per minute per IP

### 2.4 Strengths & Considerations

**Strengths:**
- bcryptjs 12 rounds for all password hashing
- SSO auto-provisioned users cannot bypass to local auth (empty password hash)
- Break-glass mechanism provides emergency access without permanent local-auth exposure
- Password reset tokens: SHA-256 hashed, single-use, 1-hour TTL, atomic consumption
- No SSO credentials in environment variables

**Considerations:**
- `next-auth` v5 is currently in beta. Monitor the Auth.js release cycle for stable versions and security advisories
- `trustHost: true` is broad. Consider scoping to the `APP_URL` host if deployment topology allows
- Session timeout is not enforced server-side in JWT claims. The JWT `exp` field should be evaluated against the configurable `sessionTimeoutMinutes` setting
- No MFA (multi-factor authentication) support. This is acceptable for small-business use but should be on the roadmap for larger deployments

---

## 3. Authorization — Role-Based Access Control (RBAC)

### 3.1 Permission Model

Authorization is **permission-based**, not role-based. Three system roles are seeded by default:

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | Full access (locked, cannot be deleted or edited) | All 17 permissions |
| **Reviewer** | Write + review access | `*:view`, `*:edit`, `*:manage`, `assessments:review`, `findings:update`, `templates:create`, `templates:import`, `roles:view` |
| **Viewer** | Read-only | `*:view` only |

Admins can create custom roles with any subset of the 17 fine-grained `resource:action` permissions.

### 3.2 Permission Catalog

| Resource | Actions |
|----------|---------|
| `vendors` | `view`, `edit`, `manage`, `import`, `export` |
| `assessments` | `view`, `edit`, `review`, `send` |
| `templates` | `view`, `edit`, `manage`, `create`, `import` |
| `findings` | `view`, `update` |
| `roles` | `view`, `manage` |
| `users` | `view`, `manage` |
| `audit` | `view` |
| `settings` | `view`, `manage`, `api:manage` |
| `compliance` | `view` |

Permission definitions, default role mappings, and helpers live in `lib/permissions.ts`. Guards (`requirePermission`, `hasPermission`) live in `lib/auth.ts`.

### 3.3 Enforcement Layers

1. **Server-side guard:** Every page, Server Action, and API route calls `requirePermission("<key>")` before executing. Unauthorized access returns a redirect to `/dashboard` (pages) or 403 (API routes).
2. **UI gating:** Controls that trigger gated actions are **hidden** (not greyed-out) via server-rendered conditionals. A Viewer sees a clean read-only screen — no write buttons, no redirect-on-click traps.
3. **Navigation + tabs:** Sidebar items the user lacks permission for are not rendered. Settings tab parameters are sanitized against the user's allowed permission set.
4. **API key auth:** Programmatic access via API keys grants **all permissions** regardless of the creating user's role. Keys are independent of the creator — deleting or disabling the creating user does not revoke the key.

### 3.4 Strengths & Considerations

**Strengths:**
- Granular 17-key catalog — no blanket "is authenticated" gating
- UI controls hidden, not greyed-out — clean least-privilege experience
- API key independence from creator account
- Last-admin protection prevents admin lockout (cannot delete, demote, or disable the last remaining admin)

**Considerations:**
- API keys always receive `ALL_PERMISSIONS`. There is no per-key permission scoping. A compromised key has full platform access. Scope-limiting keys to specific collections or actions would improve the API security model.
- Unauthorized page access returns a redirect, not a 403 page. This provides a weaker signal to the user about access denial.

---

## 4. API Security

### 4.1 API Key Architecture

API keys use a **prefix-based lookup + bcrypt verification** pattern:

1. **Key format:** `mrk_<8-hex-chars>.<48-hex-chars>` — 4 bytes of lookup prefix, 24 bytes (192 bits) of cryptographically random secret
2. **Storage:** Keys are bcrypt-hashed (12 rounds) before storage. Only the `keyHash` and `keyPrefix` are persisted
3. **Lookup:** The `keyPrefix` column is indexed for O(1) prefix matching. The 4-byte prefix (16M possible values) provides sufficient entropy to limit collision while enabling efficient indexing
4. **Verification:** The single candidate matching the prefix is bcrypt-compared against the request token. Failed verification returns 401 with no timing signal
5. **Full key exposure:** The full key (`mrk_<prefix>.<secret>`) is shown **only once** at creation, with a copy-to-clipboard button and a "Done" dismiss. After dismissal, only the prefix (e.g., `mrk_a1b2c3d4...`) is shown in the UI

### 4.2 API Key Lifecycle

| Action | Effect |
|--------|--------|
| Create | Generates new key, hashes with bcrypt, stores prefix + hash. Full key shown once |
| Revoke | Sets `disabled: true`. Key is immediately invalid |
| Enable | Re-enables a previously revoked key |
| Delete | Permanently removes the key record |
| Expiry | Optional expiry date (30/90/180/365 days or "Permanent"). Expired keys are rejected |

Key lifecycle events (create, revoke, enable, delete) are audited.

### 4.3 API Authentication Flow

`authenticateRequest()` (`lib/api-auth.ts`) handles all API authentication:

1. **Session first:** Tries Auth.js session cookie. If valid, returns user identity + role permissions
2. **API key fallback:** If `api.enabled` is true, extracts Bearer token → prefix lookup → bcrypt verify → checks expiry → checks IP allowlist → updates `lastUsedAt`
3. **Authorization:** API keys route through `hasPermission()` with `ALL_PERMISSIONS` regardless of creator status

### 4.4 IP Allowlisting

API keys support optional IP allowlisting via `allowedIps` (newline-separated entries). Supported formats:
- Exact IP (IPv4): `192.168.1.100`
- CIDR notation (IPv4 only): `10.0.0.0/8`
- Multiple entries: one per line

IP resolution uses a trusted-proxy-aware parser (`lib/client-ip.ts`):
1. Checks `CLIENT_IP_HEADER` env var (dedicated header, e.g., Cloudflare's `CF-Connecting-IP`)
2. Falls back to `X-Forwarded-For` with `TRUSTED_PROXY_COUNT`-aware rightmost-hop selection
3. Falls back to `X-Real-IP`
4. Returns `"unknown"` if nothing resolves

**Note:** IPv6 CIDR matching is not currently supported. IPv6 exact-match IPs work but CIDR prefixes are IPv4-only.

### 4.5 API Error Handling

All REST v1 endpoints go through `runApiHandler()` (`lib/api-response.ts`):
- Unexpected errors return a generic `{ error: "Internal error" }` 500 response — **no stack traces or internals leaked**
- Errors are logged server-side to the console
- Validation errors return structured `{ error: "message" }` with specific field-level details

### 4.6 API Auditing

- All API action labels are defined in `lib/db/audit.ts` (44 distinct events)
- API key operations (create, revoke, enable, delete) write audit entries
- API endpoints that modify data write audit entries via the same server actions

### 4.7 Strengths & Considerations

**Strengths:**
- bcrypt-hashed API key storage (12 rounds) — no plaintext keys in DB
- Prefix-based lookup avoids iterating all keys on every request
- Full key shown only once; immediate key rotation after compromise is possible
- Multi-layer API auth: sessions work transparently, keys work independently
- IP allowlisting with CIDR support
- Generic 500 on errors — no data leakage

**Considerations:**
- `bcrypt.compareSync` is used for API key verification (synchronous). Under high API throughput, this could become a bottleneck. Consider `bcrypt.compare` (async) for key verification
- API keys always receive `ALL_PERMISSIONS`. There is no per-key permission scoping
- IPv6 CIDR matching is not supported in `ipInCidr()`
- No API key usage metrics (requests-per-key, failure rate) beyond `lastUsedAt`

---

## 5. Portal (Vendor) Access Security

### 5.1 Token Architecture

Vendors access questionnaires via opaque, expiring tokens — no login or account creation required.

1. **Token generation:** `crypto.randomBytes(32)` → base64url — **256 bits of entropy**
2. **Token storage:** Both `accessToken` (plaintext, for URL construction) and `tokenHash` (SHA-256, for DB lookups) are stored. Tokens are **not** bcrypt-hashed (deliberate design choice: SHA-256 is faster for indexed lookups on the hot path, and tokens are not user-chosen secrets)
3. **Token expiry:** Default 30 days, configurable via `tokenValidityDays` setting
4. **Token revocation:** Sets both `accessToken` and `tokenHash` to null. Immediately blocks access
5. **Token regeneration:** Generates new token + hash, invalidates old. Extended expiry keeps the same token
6. **Portal auth cookie:** After password-gate validation, a `portal-auth` cookie is set: `httpOnly`, `secure`, `sameSite: "lax"`, path-scoped to `/portal/<token>`

### 5.2 Portal Password Gate

An optional password can be set on assessments for an additional layer of access control:
- Password is bcrypt-hashed (10 rounds) as `portalPasswordHash`
- Validation is rate-limited per token (default 5/min, configurable via `portalPasswordAttemptsPerMin`)
- On success, a `portal-auth` cookie is set allowing password-free return visits
- The cookie is compared server-side against the token parameter

### 5.3 Portal State Machine

The portal enforces a strict state machine:

```
SENT → IN_PROGRESS (first save) → SUBMITTED (vendor submits)
                                    ↓
                              UNDER_REVIEW (reviewer makes first decision)
                                    ↓
                              COMPLETED (reviewer finalizes)
                                    ↓ (reopen)
                              UNDER_REVIEW
                                    ↓ (send back to vendor)
                              IN_PROGRESS (vendor can edit again)
```

- **After submission:** Portal is read-only. No further edits, uploads, or comment additions permitted
- **Expired tokens:** "Link expired" message displayed
- **Revoked tokens:** "Link not found" message displayed (same as invalid — no enumeration)
- **Rate limiting:** Page loads, uploads, submissions, and password attempts are all independently rate-limited per IP or per token

### 5.4 Strengths & Considerations

**Strengths:**
- 256-bit token entropy — brute-force infeasible
- SHA-256 hashed in DB (not plaintext-only)
- Immediate revocation (nullifies both plaintext and hash)
- Portal password gate with bcrypt + rate limiting
- Read-only enforcement after submission
- Cookie attributes: httpOnly, secure, sameSite=lax, path-scoped

**Considerations:**
- Portal password uses bcrypt 10 rounds (vs 12 elsewhere). Minor inconsistency
- `accessToken` is stored in plaintext alongside `tokenHash` for URL construction. Both are needed for functionality, but the accessToken column is a single-point exfiltration risk if the DB is compromised
- The `portal-auth` cookie value is the token itself (used for comparison). While httpOnly protects from XSS, the token still appears in the cookie store

---

## 6. Cryptographic Controls

### 6.1 Secret Encryption at Rest

Sensitive settings (SMTP password, SSO client secrets) are encrypted at rest using **AES-256-GCM**:

- **Algorithm:** AES-256-GCM (authenticated encryption with associated data)
- **Key derivation:** `APP_ENCRYPTION_KEY` environment variable → SHA-256 hash → 32-byte AES key
- **Initialization vector:** Random 12-byte IV per encryption operation (generated via `crypto.randomBytes`)
- **Authentication tag:** GCM mode provides built-in integrity verification
- **Storage format:** `base64(IV):base64(authTag):base64(ciphertext)` — all three components stored as one DB value

The `APP_ENCRYPTION_KEY` environment variable is required and validated at boot (`z.string().min(32)`).

### 6.2 Graceful Decryption Degradation

If `APP_ENCRYPTION_KEY` changes (making stored secrets undecryptable), the platform **does not crash**. `safeDecryptSecret()` catches decrypt failures, logs the error to the server console, and returns `null`. Callers treat `null` secrets as "not configured" — the app degrades gracefully rather than 500-ing on every page.

### 6.3 Timing-Safe Comparisons

- **Cron secret:** Compared using `crypto.timingSafeEqual()` with length check before comparison
- **Password verification:** `bcrypt.compare()` is inherently constant-time

### 6.4 Hashing Summary

| Use Case | Algorithm | Parameters |
|----------|-----------|-----------|
| User passwords | bcryptjs | 12 rounds |
| API key storage | bcryptjs | 12 rounds |
| Break-glass tokens | bcryptjs | 12 rounds |
| Portal access tokens | SHA-256 | None (single-pass) |
| Password reset tokens | SHA-256 | None (single-pass) |
| App encryption key | SHA-256 | Single-pass for key derivation |

### 6.5 Strengths & Considerations

**Strengths:**
- AES-256-GCM with random IVs (authenticated encryption, not just confidentiality)
- Graceful decryption failure — no cascading 500s
- Timing-safe comparisons for high-value secrets (cron)
- bcryptjs consistently at 12 rounds across password, API key, and break-glass operations

**Considerations:**
- Key derivation (SHA-256 single-pass) — while the input (`APP_ENCRYPTION_KEY`) is expected to be a high-entropy random string, HKDF or PBKDF2 would be more formally appropriate for key derivation
- `APP_ENCRYPTION_KEY` is validated for length (≥32 chars) but not entropy. A user could set `"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"` as the key
- No secret rotation mechanism — changing `APP_ENCRYPTION_KEY` makes stored secrets permanently undecryptable. Recovery requires restoring the old key or re-saving secrets

---

## 7. Network & Transport Security

### 7.1 Content Security Policy (CSP)

A **nonce-based, strict-dynamic CSP** is applied via `proxy.ts` only to **document GET requests**. This deliberate scoping ensures Server Action POSTs and RSC payloads are not disrupted by CSP header rewrites.

```
script-src: 'self' 'nonce-<random>' 'strict-dynamic' <cdn> ('unsafe-eval' in dev only)
style-src:  'self' 'unsafe-inline' <cdn>
img-src:    'self' data: blob:
font-src:   'self' data:
connect-src: 'self'
object-src: 'none'
base-uri:   'self'
form-action: 'self'
frame-ancestors: 'none'
```

- Nonce generated via `crypto.randomUUID()` per document request
- `cdn.jsdelivr.net` is allowed in script-src, style-src, img-src, font-src for the Swagger UI CDN at `/docs`
- `'unsafe-inline'` on style-src is required for Tailwind CSS / shadcn/ui runtime styles
- `'unsafe-eval'` is allowed only in development mode (Next.js dev server requirement)
- No `upgrade-insecure-requests` — deliberately omitted per design to support HTTP-accessed self-hosted deployments

### 7.2 Security Headers

Applied to every response via `proxy.ts`:

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Content-Type-Options` | `nosniff` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), browsing-topics=()` |

**Not set:**
- `Strict-Transport-Security` (HSTS) — intentionally omitted. The app is designed to run behind a TLS-terminating reverse proxy; adding HSTS at the app layer could break HTTP self-hosted setups. The reverse proxy should set HSTS.

### 7.3 Request Classification

`isDocumentRequest()` determines whether to apply the full CSP:
- Only GET requests qualify
- Excludes requests with `next-action` or `rsc` headers (Server Action POSTs and RSC payloads)
- Requires `Accept: text/html`
- Non-document requests (POSTs, RSC, API fetches) receive security headers only — no CSP mutation

This classification is critical: mutating CSP on Server Action requests breaks action result delivery in production.

### 7.4 Reverse Proxy Support

Client IP resolution (`lib/client-ip.ts`) supports multi-proxy topologies:
- `TRUSTED_PROXY_COUNT` env var controls how many rightmost `X-Forwarded-For` hops are trusted
- `CLIENT_IP_HEADER` env var allows using a dedicated header (e.g., `CF-Connecting-IP`)
- Default `TRUSTED_PROXY_COUNT = 0` means `X-Forwarded-For` is ignored (direct access)
- Auth.js `trustHost: true` + optional `AUTH_URL` override ensure correct origin/cookie derivation behind proxies

### 7.5 Strengths & Considerations

**Strengths:**
- Nonce-based CSP with strict-dynamic (strong script isolation)
- `frame-ancestors: 'none'` (modern clickjacking protection)
- Server Action / RSC detection prevents CSP header corruption
- Trusted-proxy-aware IP resolution for rate limiting and API key allowlisting
- Proxy config documentation in README (Caddy, nginx, Zoraxy, Azure samples)

**Considerations:**
- No HSTS header — rely on reverse proxy for HSTS enforcement
- No CSP violation reporting (`report-uri` / `report-to`)
- `connect-src: 'self'` — any future frontend API calls to external services will require CSP updates
- Nonce uses `randomUUID()` — adequate, but `randomBytes(16)` would explicitly signal cryptographic intent

---

## 8. Rate Limiting & Abuse Prevention

### 8.1 Implementation

An **in-memory sliding-window rate limiter** (`lib/rate-limit.ts`) with:
- Fixed 60-second windows
- Maximum 50,000 tracked entries (FIFO eviction when full)
- Periodic sweep of expired entries (every 60s)

This is intentionally per-process/in-memory — correct for the single-container Docker Compose deployment. A shared store (Redis) is required only if horizontally scaled.

### 8.2 Rate Limit Points

All configurable via DB-backed `AssessmentSettings` (Settings → Limits tab):

| Limit Key | Default | Applied To |
|-----------|---------|-------------|
| `loginRateLimitPerMin` | 10/min | Login action **and** credentials-callback (independent of the form) |
| `portalPageLoadsPerMin` | 30/min | Portal page loads per IP |
| `portalUploadsPerMin` | 10/min | Portal file uploads per IP |
| `portalSubmitPerMin` | 5/min | Portal submissions per IP |
| `portalPasswordAttemptsPerMin` | 5/min | Portal password attempts per token |
| `passwordResetPerMin` | 1/min | Password reset requests per IP |
| `breakGlassPerMin` | 10/min | Break-glass login attempts per IP |
| `apiDefaultRateLimitPerMin` | 30/min | API key prefix lookups |

### 8.3 Strengths & Considerations

**Strengths:**
- Granular rate limit points across login, portal, API, and recovery paths
- All configurable via DB settings — no redeploy needed to adjust
- Credentials callback is also rate-limited (the actual auth path), not just the form action
- Eviction prevents unbounded memory growth
- Over-limit responses are generic (no enumeration signal)

**Considerations:**
- In-memory only — not shared across containers or processes. Acceptable for single-container deployment
- FIFO eviction (not LRU) — a sustained attack could evict legitimate entries
- No exponential backoff or lockout escalation — flat per-minute limits
- No `X-RateLimit-*` response headers for client awareness

---

## 9. File Security

### 9.1 Storage Architecture

File storage is interface-abstracted (`lib/storage/index.ts`) with a local-disk implementation. The interface supports `save`, `read`, `delete`, and `list` operations, making it swappable to S3/MinIO without changing application code.

### 9.2 Path Traversal Prevention

The `resolveKeyPath()` function prevents directory traversal:
1. Resolves the relative storage key against the `storageRoot` base path
2. Checks the resolved path starts with `storageRoot + path.sep`
3. Throws an error if traversal is detected

This is a cross-platform guard (works on both forward-slash and backslash filesystems).

### 9.3 File Serving

Evidence files are served **only** through an authenticated route (`GET /api/files/[evidenceId]`):
- Requires valid Auth.js session
- Requires `ASSESSMENTS_VIEW` permission
- Looks up evidence record by ID (not user-supplied path)
- Reads file via storage interface using `evidence.storageKey` (server-controlled, not user-supplied)
- Sets `X-Content-Type-Options: nosniff`
- Inline display is restricted to a **MIME type allowlist**: PDF, PNG, JPEG, GIF, WebP. All other types are forced to `application/octet-stream` download
- File access is **not** individually audited (logged only at the permission-check level)

### 9.4 File Upload

Portal file uploads are restricted by:
- **Extension allowlist:** Configurable via `FileSettings` (default: `pdf, png, jpg, jpeg, docx, xlsx`)
- **Size limit:** Configurable `maxUploadMb` (default: 20 MB)
- **MIME type validation:** Uploads are checked against a server-side MIME deny-list — script-renderable types (`text/html`, `image/svg+xml`, JavaScript MIME types) are rejected. The extension check is the primary filter; MIME validation is defense-in-depth

### 9.5 File Lifecycle & Cleanup

- **Record deletion:** Deleting an assessment or vendor deletes associated evidence rows AND their physical storage files (best-effort; a missing file never blocks the DB delete)
- **Replaced uploads:** Uploading new evidence for a question deletes the previous file (row + storage)
- **Orphan sweep:** Cron endpoint sweeps for unreferenced files older than 1 hour (backstop for any missed cleanup)

### 9.6 Strengths & Considerations

**Strengths:**
- Path traversal prevention with cross-platform guard
- File access via evidence ID (not user-supplied paths)
- MIME type allowlist for inline display + MIME deny-list for uploads
- `X-Content-Type-Options: nosniff` on all file responses
- Multi-layer cleanup: record deletion, upload replacement, cron sweep

**Considerations:**
- No magic-byte (file signature) validation on upload — a file with a `.pdf` extension but malicious content would pass. Content-Type sniffing is the primary defense via `nosniff`
- No virus/malware scanning of uploaded files
- No per-file access audit logging (who accessed which file and when)

### 9.7 Cloud Storage (S3 / Azure Blob)

External cloud storage is supported through the same `FileStorage` interface. A Storage tab in Settings lets admins configure AWS S3 or Azure Blob as the storage backend. The provider is selected lazily at runtime — no restart required.

**Provider selection:**
- Default: local disk (`EVIDENCE_STORAGE_PATH` env var)
- Configurable per-provider: S3 (bucket, region, access key ID, secret access key) and Azure (connection string, container name)
- Secrets are encrypted at rest using the same AES-256-GCM pattern as SMTP/SSO credentials
- Falls back to local disk if cloud initialization fails (no data loss, logged to console)

**Strengths:**
- Same `FileStorage` interface for all providers — no application code changes needed to switch
- Dynamic SDK imports (`@aws-sdk/client-s3`, `@azure/storage-blob`) — no bundle bloat for local-only deployments
- Credential fields are write-only (blank submissions preserve existing secrets)
- Graceful degradation on initialization failure

**Considerations:**
- No automatic file migration between providers. Switching storage backends requires manual migration of existing files
- Cloud SDKs are optional peer dependencies — must be installed manually (`npm install @aws-sdk/client-s3` or `npm install @azure/storage-blob`)
- S3 `ListObjectsV2` API calls incur cost during the cron orphan sweep (acceptable for the data volumes of a small-business TPRM tool)
- Cloud credentials stored in the database — a DB compromise could expose them if `APP_ENCRYPTION_KEY` is also compromised

### 9.8 Attachment Model

A polymorphic `Attachment` model (`entityType` + `entityId`) supports file uploads on any entity. Currently used for:
- **VendorCertification** — certificates, audit reports
- **Vendor** — contracts, letters of engagement, scope documents

Attachments are served through `GET /api/attachments/[attachmentId]` with the same security profile as evidence files (authenticated, `nosniff`, MIME allowlist for inline display). Files are stored through the same `FileStorage` interface and deleted on record removal.

---

## 10. Logging, Audit & Monitoring

### 10.1 Audit Log

All state-changing operations are recorded in the `AuditLog` table:

| Field | Description |
|-------|-------------|
| `userId` | The user who performed the action (nullable via SetNull — "Deleted user" on user deletion) |
| `action` | One of 44 distinct action codes (e.g., `LOGIN`, `CREATE_VENDOR`, `REVIEW_DECISION`) |
| `entityType` | The target entity type (e.g., `Assessment`, `Vendor`, `Template`) |
| `entityId` | The target entity ID |
| `meta` | JSON field for additional context (e.g., review decision, note, changed fields) |
| `createdAt` | Timestamp of the event |

### 10.2 Audited Events

The audit covers 44 distinct actions across the following domains:

- **Authentication:** LOGIN
- **Assessments:** create, delete, send, revoke, extend, regenerate, submit, reopen, finalize, review decision, send back to vendor
- **Vendors:** create, update, delete, import
- **Templates:** create, update, delete, publish, unpublish, version, duplicate, import
- **Users:** create, disable, enable, change role, reset password, delete, update profile
- **Settings:** update
- **API Keys:** create, revoke, enable, delete
- **Roles:** create, update, delete, duplicate
- **Certifications:** create, update, delete
- **Frameworks:** import
- **Comments:** add comment
- **Findings:** update status

### 10.3 Audit Log Properties

- **User-preserving deletion:** `AuditLog.userId` is `ON DELETE SET NULL`. Deleting a user preserves their audit entries as "Deleted user"
- **Fire-and-forget:** `logAuditSafe()` wraps `logAudit()` and catches errors — audit logging failures never block the operation being logged. Failures are logged to the server console
- **Retention:** Configurable via `audit.retentionDays` setting (default: 0 = never prune). The cron job prunes entries older than the configured retention period
- **Querying:** Paginated, filterable by action, user, and date range. Available via the Settings → Audit tab (UI) and REST API
- **Export:** CSV export available from the Audit tab

### 10.4 Email Tracking

All email sends (invite, reminder, escalation, clarification, expiry notices, test sends) are logged in the `NotificationLog` table with:
- `status`: `SENT` or `FAILED`
- `errorMessage`: SMTP error if failed (visible in the Email Tracking tab)
- `subject`, `sentTo`, `sentById`, `assessmentId`
- Retry button for failed sends
- Sidebar notification badge surfaces failed emails in the last 24 hours

### 10.5 Strengths & Considerations

**Strengths:**
- Comprehensive event catalog (44 distinct actions)
- User-preserving deletion (SetNull)
- Fire-and-forget logging doesn't block operations
- Configurable retention with cron pruning
- Failed email tracking with retry capability

**Considerations:**
- No read-audit events — viewing a vendor, assessment, or evidence file is not recorded
- No tamper-proofing — audit logs are regular DB rows without hash-chaining or append-only guarantees. A database-level attacker could modify or delete audit records
- No SIEM-friendly export format (e.g., NDJSON or CEF/Syslog)
- No cron execution timestamp tracking — there is no record of when the cron last ran, making it hard to detect missed runs

---

## 11. Input Validation & Output Encoding

### 11.1 Validation Strategy

External input is validated comprehensively via **zod** schemas at every boundary:

**Authentication schemas:** Login credentials, password reset, profile update, and first-run admin setup — all zod-validated with appropriate constraints (email format, minimum lengths, confirmation matches)

**Domain schemas:** Vendor creation/update, assessment lifecycle, template construction (sections, questions with all 12 types, conditional logic), certifications, and roles — all validated server-side before persistence

**Settings schemas:** All operational settings (email, SMTP, scoring, scheduling, file limits, appearance, SSO, rate limits) are zod-validated on every save. Settings-stored secrets are validated, encrypted, and never returned to the client

**Portal input:** Answer submissions are validated against `portalAnswerSchema` — assessmentQuestionId, value (union of string/number/boolean/array), and isNotApplicable flag

**API input:** REST API endpoints use `runApiHandler()` with zod-validated request bodies and query parameters

### 11.2 Additional Validation

- **Conditional logic evaluation:** Portal questions are rendered only if their conditional rules evaluate true against the current answer state — preventing hidden questions from being answered or submitted
- **Required field enforcement:** On submission, visible questions with `required: true` must have a non-empty answer. Validation is server-side (not bypassable via client manipulation)
- **Status transition guards:** Assessment status changes are validated server-side — a vendor cannot submit an already-submitted assessment, a reviewer cannot review a not-yet-submitted one
- **Prisma parameterized queries:** All database operations use Prisma's parameterized query builder — no raw SQL injection vectors

### 11.3 Output Encoding

- React/JSX provides automatic XSS protection via HTML escaping
- Email templates rendered via React Email (`@react-email/components`) — components handle HTML encoding
- Template tokens (`{{vendorName}}`, `{{portalUrl}}`, etc.) are replaced in email bodies via simple string replacement. Token values are sourced from the database (vendor names, email addresses), not direct user input

### 11.4 Strengths & Considerations

**Strengths:**
- Comprehensive zod validation at every input boundary
- Server-side required-field and conditional-logic enforcement
- Prisma parameterized queries eliminate SQL injection risk
- Settings validation prevents malformed configuration

**Considerations:**
- Portal answer values have no maximum length validation — an attacker could submit a 1MB string as a single answer
- Email template token replacement does not HTML-sanitize token values. Since tokens come from DB fields (names, dates), the risk is low, but a compromised DB could inject HTML into outgoing emails
- No Content-Type validation of file uploads by magic bytes — extension-based validation only

---

## 12. Deployment & Operational Security

### 12.1 Container Security

| Aspect | Current State | Recommendation |
|--------|---------------|----------------|
| Base image | `node:22-slim` (Debian) | Appropriate — slim variant reduces attack surface |
| Non-root user | **Runs as root** | Add `USER node` after `npm install` |
| Read-only root filesystem | Not configured | Add `read_only: true` in compose, mount writable volumes only where needed |
| Resource limits | Not configured | Add CPU/memory limits in compose |
| Health check | `/api/health` (200 = healthy) | Adequate |
| Exposed port | 3000 (no reverse proxy) | Document requirement for reverse proxy (Caddy/nginx) |

### 12.2 Deployment Constraints

- `CRON_SECRET` is **required in production** — the app refuses to boot without it (enforced at env validation). Build phase is exempted so `next build` runs without runtime secrets
- `TRUSTED_PROXY_COUNT` defaults to `0` (no proxy) — must be set to the actual hop count behind a reverse proxy
- Hardcoded credentials in `docker-compose.yml` (`POSTGRES_USER: mitch`, `POSTGRES_PASSWORD: mitch`) should be overridden via `.env` files or Docker secrets in production
- Port 3000 is published directly in the provided compose file — production deployments should place a reverse proxy (Caddy, nginx) in front and not publish port 3000 externally

### 12.3 Database

- Prisma migrations are applied on container start (`prisma migrate deploy`) — if a migration fails, the container enters a restart loop
- Password hashes and API key hashes stored in the database — bcrypt provides protection against offline cracking
- Encrypted secrets (SMTP password, SSO client secrets) use AES-256-GCM with the key stored outside the database in the `APP_ENCRYPTION_KEY` environment variable — a DB compromise alone cannot decrypt stored secrets
- Database credentials are passed via environment variables — not stored in application code

### 12.4 Backup Guidance

Backup scripts (`scripts/backup.sh` / `scripts/backup.ps1`) are provided for `pg_dump` operations. The scripts create timestamped `.sql.gz` files and auto-rotate keeping the last 7 backups. Evidence files should be backed up separately from the `EVIDENCE_STORAGE_PATH` volume.

### 12.5 Strengths & Considerations

**Strengths:**
- Multi-stage Docker build for smaller attack surface
- Build secrets are placeholders (not real credentials)
- Enforced `CRON_SECRET` in production
- `APP_ENCRYPTION_KEY` stored outside the DB
- Auto-migration on start (no manual migration step)

**Considerations:**
- Container runs as root — highest priority hardening item
- Hardcoded DB credentials in compose file
- No read-only root filesystem
- No resource limits
- No non-root user in Dockerfile

---

## 13. Dependency & Supply Chain Security

### 13.1 Key Dependencies

| Dependency | Version | Security Role |
|-----------|---------|---------------|
| `next` | 16.2.9 | Framework |
| `next-auth` | ^5.0.0-beta.31 | Authentication (beta) |
| `bcryptjs` | ^3.0.3 | Password/API key hashing |
| `@prisma/client` | ^6.19.3 | Database ORM |
| `nodemailer` | ^7.0.13 | Email transport |
| `zod` | ^4.4.3 | Input validation |
| `@react-pdf/renderer` | ^4.5.1 | PDF generation |
| `@react-email/components` | ^1.0.12 | Email template rendering |
| `recharts` | ^2.15.4 | Dashboard charts |

### 13.2 Supply Chain Notes

- `bcryptjs` (pure JavaScript) is used over `bcrypt` (native C++ bindings) — deliberate choice to avoid native compilation issues in CI/CD and container builds. bcryptjs provides equivalent security
- `next-auth` v5 is in beta. Monitor for stable releases and security advisories. The beta API may contain undiscovered vulnerabilities
- `zod` v4 is a major version — verify that breaking changes from v3 are understood and accommodated
- No `npm audit` or Dependabot configuration is visible in the repository. Consider adding automated vulnerability scanning to CI

---

## 14. Data Lifecycle & Privacy

### 14.1 Data at Rest

| Data Type | Storage | Protection |
|-----------|---------|------------|
| Passwords | `User.passwordHash` (DB) | bcryptjs 12 rounds |
| API keys | `ApiKey.keyHash` (DB) | bcryptjs 12 rounds |
| SMTP password | DB Settings | AES-256-GCM encrypted |
| SSO client secrets | DB Settings | AES-256-GCM encrypted |
| Portal tokens | `Assessment.tokenHash` (DB) | SHA-256 hashed |
| Password reset tokens | DB | SHA-256 hashed |
| Break-glass tokens | DB Settings | bcryptjs 12 rounds |
| Vendor data | DB | Unencrypted (standard DB access controls) |
| Assessment responses | DB | Unencrypted (standard DB access controls) |
| Uploaded files | Disk (volume) | Unencrypted at rest on disk |

### 14.2 Data Deletion

- Deleting a vendor or assessment deletes all associated records AND physical evidence files (best-effort)
- Deleting a user preserves audit and review history via `SetNull` (displayed as "Deleted user")
- Replacing evidence uploads deletes the previous file
- Cron orphaned-file sweep is a backstop for any missed file cleanup
- Template version deletion re-links child versions to the deleted version's parent — no orphaned history chains

---

## 15. Risk Register

### High Severity

| ID | Finding | Impact | Mitigation |
|----|---------|--------|------------|
| H-1 | Container runs as root (`Dockerfile:21`) | Container compromise = host root access | Set `USER node` in Dockerfile before CMD |
| H-2 | Hardcoded DB credentials in `docker-compose.yml` | Credential exposure in version control | Use `.env` files or Docker secrets |
| H-3 | No `CRON_SECRET` in compose env | App fails to boot in production | Add `CRON_SECRET` to compose env |
| H-4 | API keys have `ALL_PERMISSIONS` without scoping | Key compromise = full platform access | Implement per-key permission scoping |

### Medium Severity

| ID | Finding | Impact | Mitigation |
|----|---------|--------|------------|
| M-1 | No MFA support | Account compromise via credential theft | Roadmap item for larger deployments |
| M-2 | Session timeout not enforced server-side | Sessions persist beyond configured timeout | Add `exp` claim to JWT based on `sessionTimeoutMinutes` |
| M-3 | In-memory rate limiting not shared across processes | Rate limits bypassed with multi-container deployment | Acceptable for single-container; migrate to Redis if scaled |
| M-4 | No magic-byte validation on file uploads | Malicious files bypass extension filter | Add libmagic or file-type detection |
| M-5 | Password min-length not enforced at login schema | Users with short passwords from legacy systems | Low risk — bcrypt comparison fails for mismatched passwords |
| M-6 | No HSTS header | Downgrade attacks if reverse proxy misconfigured | Document HSTS at proxy level; consider app-layer defense-in-depth |
| M-7 | `next-auth` in beta | Undiscovered vulnerabilities in auth framework | Monitor updates; migrate to stable when available |

### Low Severity

| ID | Finding | Impact | Mitigation |
|----|---------|--------|------------|
| L-1 | Portal password uses bcrypt 10 rounds (vs 12) | Slightly weaker brute-force resistance | Minor — both are strong |
| L-2 | No read-audit events | Cannot determine who viewed sensitive data | Acceptable for small-business scope |
| L-3 | No audit log tamper-proofing | DB-level attacker can modify audit records | Add hash-chain or append-only table |
| L-4 | No container resource limits | DoS via resource exhaustion | Add CPU/memory limits in compose |
| L-5 | Key derivation uses single-pass SHA-256 | Non-ideal for PBKDF purposes | Low severity — input is high-entropy random key |
| L-6 | No IPv6 CIDR support in API key IP allowlisting | IPv6 CIDR restrictions not enforced | Add IPv6 CIDR support to `ipInCidr()` |
| L-7 | No CSP violation reporting | Cannot detect CSP misconfigurations | Add `report-uri` directive |

---

## 16. Compliance Considerations

### 16.1 ISO 27001

The platform supports ISO 27001:2022 Annex A compliance by:
- Providing the full Annex A control library (93 controls) as seed data
- Mapping assessment questions to controls for automated compliance scoring
- Generating findings for non-compliant answers with control traceability
- Producing vendor risk profiles with domain-level compliance breakdowns
- Maintaining audit logs of all state-changing operations

### 16.2 SOC 2

SOC 2 Trust Services Criteria (51 criteria) are seeded and mapped identically to ISO 27001 controls, enabling dual-framework compliance assessment.

### 16.3 NIST CSF 2.0 & Essential Eight

NIST CSF 2.0 (129 subcategories) and ASD Essential Eight (55 controls with maturity levels) are seeded and available for assessment mapping.

### 16.4 Deployment-Specific Compliance

The platform provides mechanics (controls mapping, scoring, findings, audit trail) but does not provide compliance certification out of the box. Organisational processes (security policies, access reviews, change management) must be implemented independently.

---

## 17. Security Contact & Reporting

This document is maintained as part of the mitch-risk project. Security findings should be reported via the project's issue tracker.

**Last reviewed:** July 2026
**App version:** 0.1.0
