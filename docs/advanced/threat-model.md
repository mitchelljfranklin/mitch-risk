# Threat Model

This page summarises the security threats mitch-risk is designed to mitigate, helping security architects and assessors evaluate the platform's security posture.

## What We Protect

| Asset | Sensitivity | Location |
|---|---|---|
| Vendor names, contacts, tiers | Confidential | PostgreSQL (encrypted at rest via database, not application) |
| Assessment responses (answers, evidence) | Confidential | PostgreSQL + file storage (local/S3/Azure) |
| Staff credentials (password hashes, SSO links) | Critical | PostgreSQL (bcrypt-hashed passwords, AES-256-GCM secrets) |
| Portal tokens and passwords | Sensitive | PostgreSQL (SHA-256 hashed tokens, bcrypt hashed portal passwords) |
| Audit log (who did what, when) | Sensitive | PostgreSQL (pruneable, configurable retention) |
| Uploaded files (evidence, certs, attachments) | Confidential | File storage (authenticated serving, MIME validation) |

## Trust Boundaries

```
  ┌─────────┐   HTTPS    ┌──────────┐   HTTP    ┌──────────────┐   TCP    ┌───────────┐
  │ Browser │◄──────────┤  Reverse  │─────────►│  Next.js App │────────►│ PostgreSQL│
  │ / API   │           │  Proxy    │           │  (port 3000) │         │  (port    │
  │ Client  │           │ (Caddy/   │           │              │         │   5432)   │
  └────┬────┘           │  nginx)   │           └──────┬───────┘         └───────────┘
       │                └──────────┘                   │
       │  Portal link                                       │   ┌──────────────┐
       │  (no-login token)                                  ├──►│ File Storage │
       │                                                    │   │ (local/S3/   │
  ┌────▼────┐                                              │   │  Azure)      │
  │ Vendor  │                                              │   └──────────────┘
  │ Portal  │                                              │
  └─────────┘                                         ┌────▼───────┐
                                                       │ SMTP Relay │
                                                       │ (outbound) │
                                                       └────────────┘
```

| Boundary | Protocol | Auth Required | Notes |
|---|---|---|---|
| Browser → Reverse Proxy | HTTPS | Session cookie or API key | TLS terminated at proxy |
| Reverse Proxy → App | HTTP | None (trusted network) | Internal Docker network |
| App → PostgreSQL | TCP | Password (connection string) | Internal Docker network |
| App → File Storage | API | S3/Azure credentials or filesystem | Credentials AES-256-GCM encrypted |
| App → SMTP | TLS (port 587) | SMTP AUTH | Password encrypted at rest |
| Vendor → Portal | HTTPS | Opaque token in URL | No login, optional password gate |

## Threat Matrix

| Threat | Attack Vector | Mitigation | Severity |
|---|---|---|---|
| **Credential stuffing** | Repeated login attempts | Rate-limited at 10/min per IP. bcrypt 12 rounds — computationally expensive even on success | Medium |
| **Session hijacking** | Cookie theft via XSS, man-in-the-middle | `httpOnly` + `secure` cookies. Nonce-based strict-dynamic CSP blocks inline scripts. TLS provides transport security | Low |
| **XSS (reflected/stored)** | Malicious script in vendor answers, template fields, or email tokens | React/JSX auto-escapes HTML. CSP `script-src 'nonce-...' 'strict-dynamic'` — no inline scripts or eval allowed in production. File upload MIME blocklist rejects SVG and HTML | Low |
| **CSRF** | Cross-site requests to state-changing endpoints | Server Actions use POST with built-in CSRF protection. API routes require explicit auth header. CORS not configured (same-origin) | Low |
| **SQL injection** | Malicious input in query parameters, CSV imports, API payloads | All database access through Prisma parameterised queries. No raw SQL strings. Zod validates all external input before persistence | Low |
| **API key compromise** | Leaked or stolen bearer token | bcrypt-hashed in database (never stored plaintext). Prefix-indexed lookup prevents full-table scan. IP allowlisting via CIDR blocks unauthorised IPs. Configurable expiry and per-key rate limiting. Keys disabled instantly from Settings | Low |
| **Portal token guessing** | URL traversal or brute force | 256-bit random token (2^256 search space). Rate-limited page loads (30/min per visitor). Server-enforced expiry. Opaque token is SHA-256 hashed for DB storage | Low |
| **File upload attack** | Malicious file upload (malware, polyglot, oversized) | MIME type blocklist: HTML, JS, SVG, PHP, XML, executables, shell scripts. Configurable max upload size (default 20 MB). Configurable extension allowlist. File storage path uses `resolve()` + `startsWith()` to prevent traversal. Rate-limited uploads on portal (10/min) | Medium |
| **Secret exposure** | Database dump, environment leak, or config file access | SMTP password, SSO client secrets, cloud storage credentials encrypted at rest with AES-256-GCM. Encryption key in environment variable only. Secrets never returned to client (masked in API responses). DB settings returns boolean for password presence, not the value | Low |
| **Privilege escalation** | Unauthorised access via role/permission manipulation | Four-layer RBAC: page access (server component), UI gating (controls hidden not greyed), server action gating (permission check before write), API route gating (bearer auth + permission). Custom roles cannot self-escalate. Admin role locked | Low |
| **Timing attack** | Timing-based secret comparison (CRON_SECRET, password, token) | CRON_SECRET compared with `crypto.timingSafeEqual()`. bcrypt comparison is constant-time by design. API key prefix lookup + bcrypt verify (not raw string match) | Low |
| **SSO lockout** | Identity provider unavailable, all staff locked out | Break-glass URL (`/login?break-glass=<token>`) re-enables local login. Token bcrypt-hashed in DB, expires in 24 hours, single-use (consumed on first use). Rate-limited (10/min per IP) | Low |
| **Replay attack** | Captured HTTP traffic replayed | TLS enforced at reverse proxy (HTTPS). `secure` cookie flag prevents cookie transmission over plain HTTP. JWT session is stateless (server does not maintain session state to correlate replays). API keys can be revoked instantly | Low |
| **Information disclosure** | Sensitive data in logs, error messages, or API responses | File evidence served only through authenticated route (never public URLs). API error wrapper (`runApiHandler`) catches unexpected errors → generic 500, logs details server-side only. Zod validation errors return structured messages without exposing internals | Low |
| **Denial of service** | Resource exhaustion via excessive requests | Fixed-window rate limiter on login, portal access, file uploads, submissions, password reset, break-glass, and API endpoints. Configurable limits per concern. Max 100,000 tracked keys with per-namespace 5K cap; rejects when full | Medium |
| **Dependency vulnerability** | Known CVE in third-party library | CI pipeline runs lint + typecheck + build on every push. npm audit on dependencies. Node 22 LTS pinned. All dependencies are regular (not optional peer) for reproducible installs | Low |

## What We Don't Protect Against (Out of Scope)

- **Physical access** to the server — the threat model assumes the deployment environment is physically secured
- **Root compromise of the host** — database or file storage accessible to anyone with root on the Docker host is fully readable
- **Insider threat by Admin** — the Admin role has full access to all data. No audit trail suppression prevention
- **MFA** — Multi-factor authentication is not implemented (acceptable for small business; on the roadmap)
- **Horizontal scaling** — the in-memory rate limiter shares no state across containers. Multi-container deployments should use a shared Redis store (not yet implemented)
