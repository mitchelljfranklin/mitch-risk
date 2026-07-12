# Phase 111 — TOTP multi-factor authentication for local auth (org-wide)

**Summary:** Add TOTP-based MFA via authenticator apps (Google Authenticator, Authy, 1Password, etc.). Admin-controlled org-wide enforcement (`requireTotp` toggle in Settings → Limits). SSO users are exempt (MFA at IdP level). Per-user TOTP remains self-service first — you must set it up before it can be enforced on you.

---

## Architecture

### Two-step login flow

```
Login form → validate email+password →
  ├─ totpEnabled = false, requireTotp = false → signIn("credentials") → /dashboard (unchanged)
  ├─ totpEnabled = false, requireTotp = true  → set "mfa-setup-required" cookie →
  │                                              redirect to /profile?setup=mfa (forced enrollment)
  └─ totpEnabled = true  → encrypt {userId, exp} → set "mitch-risk-mfa-challenge" cookie →
                            redirect to /login/verify →
                              user enters 6-digit code (or backup code) →
                              validate TOTP → generate HMAC trust token →
                              signIn("credentials", { email, mfaPayload }) →
                              authorize callback validates HMAC + 10s TTL → /dashboard
```

### Key components

| Component | Detail |
|---|---|
| **Challenge cookie** | AES-256-GCM encrypted `{userId, exp}` (`lib/crypto.ts`), httpOnly, secure, sameSite=lax, 90s TTL. Set at step 1, consumed at step 2. |
| **MFA trust token** | `{userId}:{timestamp}:{HMAC-SHA256(userId:timestamp, AUTH_SECRET)}`. 10s TTL. Stateless — no DB column needed. Validated in `authorize` callback. |
| **TOTP window** | ±1 step (30s before/after current window). Prevents replay within the same window via `totpVerifiedAt` timestamp check. |
| **Backup codes** | 8 alphanumeric codes, bcrypt-hashed, stored as Postgres `text[]`. Compare all 8 (constant-time per comparison, all compared to avoid timing side channel), remove matching hash on use. One use per code. |
| **Session trust** | `mfaVerified: true` in JWT token after first verification. No re-challenge for the session duration (30 min default). |
| **Forced enrollment** | When `requireTotp` is on and user lacks TOTP, JWT gets `totpSetupRequired: true`. Session callback restricts permissions to `PROFILE_EDIT` only — user can only access `/profile` until TOTP is set up. |

---

## Org-wide enforcement

### Setting

`requireTotp: boolean` (default `false`) — lives in the existing `assessmentSettings` category alongside session timeout, rate limits, and retention controls. Surfaced in Settings → Limits form.

### Admin safeguard

When an admin toggles `requireTotp` ON, the save action checks:

1. The admin themselves has TOTP set up — if not, reject with: *"You must set up two-factor authentication on your own account before requiring it for the organization."*
2. If yes, show a confirmation dialog: *"N users with local passwords do not have TOTP set up. They will be required to enroll on their next login. Enable anyway?"*

### Enforcement points

| Point | Mechanism |
|---|---|
| **Login** | In `authenticate()` server action: after credential validation, if `requireTotp && !user.totpEnabled`, set a `mfa-setup-required` cookie and redirect to `/profile?setup=mfa`. |
| **Session** | In JWT callback: set `totpSetupRequired: true` on the token when `requireTotp && userHasLocalPassword && !totpEnabled`. In session callback: if `totpSetupRequired`, narrow permissions to only `PROFILE_EDIT`. All other page guards see no permissions and redirect to `/dashboard` (which in turn redirects to `/profile`). |
| **SSO bypass** | SSO logins are never gated. The session callback only sets `totpSetupRequired` for credential-sourced tokens. SSO-only users (no `passwordHash`) are always exempt. |

### Disabling

Toggle `requireTotp` OFF — all users resume normal login immediately. No confirmation needed.

### Affected user count

A new data-access helper `countUsersWithoutTotp()` filters `WHERE passwordHash IS NOT NULL AND passwordHash != '' AND totpEnabled = false`. Displayed in the confirmation dialog when toggling on.

---

## TOTP enrollment flow (Profile page)

Also serves as the forced-enrollment landing page when `requireTotp` is active.

1. User arrives at `/profile?setup=mfa` (voluntarily or forced)
2. Sees "Set up two-factor authentication" card with explanation of what TOTP is
3. Clicks "Set up" → generates secret → shows QR code (`qrcode` library → canvas → data URL) + manual entry text
4. User scans QR, enters a 6-digit verification code
5. If valid: commits secret (encrypted at rest with AES-256-GCM), sets `totpEnabled = true`, generates + shows 8 backup codes (one-time display with "I've saved these" confirmation + copy/download buttons)
6. If invalid: error message, user retries (rate-limited: 5 attempts per 60s)
7. If forced enrollment (`totpSetupRequired` in session): after successful setup, session callback clears the flag → user gets full permissions restored
8. **Disable flow:** "Disable" button → requires current password → clears secret, codes, sets `totpEnabled = false`

---

## Admin recovery

Settings → Users tab → "Reset MFA" button on users with `totpEnabled = true`. Gated by `USERS_MANAGE`. Clears `totpSecret`, `totpBackupCodes`, sets `totpEnabled = false`. Audited as `RESET_USER_MFA`.

---

## Data model

### User model additions

```prisma
model User {
  // ... existing fields ...
  totpSecret       String?   // AES-256-GCM encrypted TOTP secret (null = not set up)
  totpEnabled      Boolean   @default(false)
  totpBackupCodes   String[]  @default([]) // bcrypt-hashed backup codes (Postgres text[])
  totpVerifiedAt   DateTime? // Last TOTP verification (for replay prevention + UI display)
  totpEnabledAt    DateTime? // When TOTP was first enabled (informational)
}
```

### Settings schema addition

Add to `assessmentSettingsSchema` in `lib/settings/schema.ts`:

```ts
requireTotp: z.boolean().default(false),
```

---

## Files

| File | Action | Purpose |
|---|---|---|
| `lib/mfa.ts` | **New** | `generateTotpSecret()`, `verifyTotpToken()`, `generateBackupCodes()`, `verifyBackupCode()`, `createChallengeCookie()`, `readChallengeCookie()`, `createTrustToken()`, `verifyTrustToken()` |
| `lib/schemas/auth.ts` | Edit | Add `totpSetupSchema`, `totpVerifySchema` |
| `lib/db/users.ts` | Edit | Add `getUserTotpInfo()`, `saveTotpSecret()`, `enableTotp()`, `disableTotp()`, `consumeBackupCode()`, `clearTotp()`, `countUsersWithoutTotp()`; update `listStaffAccounts()` to include `totpEnabled` |
| `lib/settings/schema.ts` | Edit | Add `requireTotp` to `assessmentSettingsSchema` |
| `lib/settings/index.ts` | Edit | `requireTotp` auto-included via existing `persistCategory("assessments", ...)` path — no new accessor needed |
| `lib/auth.ts` | Edit | `Credentials.authorize`: accept optional `mfaPayload` → validate HMAC trust token; JWT callback: set `mfaVerified` + `totpSetupRequired`; session callback: pass `mfaVerified`, gate `totpSetupRequired` by narrowing permissions |
| `types/next-auth.d.ts` | Edit | Add `mfaVerified: boolean`, `totpSetupRequired: boolean` to session and token types |
| `lib/permissions.ts` | Edit | Audit catalog: add `REQUIRE_TOTP_ENABLED`, `REQUIRE_TOTP_DISABLED`, `RESET_USER_MFA`, `TOTP_SETUP`, `TOTP_DISABLED` |
| `lib/actions/users.ts` | Edit | Add `resetUserMfaAction()` gated by `USERS_MANAGE` |
| `lib/actions/profile.ts` | Edit | Add `setupTotpAction()`, `verifyAndEnableTotpAction()`, `disableTotpAction()` |
| `app/(auth)/login/actions.ts` | Edit | `authenticate()`: check `totpEnabled` + `requireTotp` → set challenge cookie + redirect, or call `signIn` as normal |
| `app/(auth)/login/verify/page.tsx` | **New** | Server Component: reads challenge cookie, renders OTP form (redirects to /login if missing/expired) |
| `app/(auth)/login/verify/verify-form.tsx` | **New** | Client Component: 6-digit OTP input (`@radix-ui/react-one-time-password-field`), "Use a backup code instead" toggle with text input, rate-limited submit |
| `app/(auth)/login/verify/actions.ts` | **New** | Server Action: decrypts challenge cookie → looks up user → validates TOTP code (or backup code) → generates HMAC trust token → calls `signIn("credentials", { email, mfaPayload })` → clears challenge cookie → redirects to `/dashboard` |
| `components/mfa-setup.tsx` | **New** | Client Component: QR code display (`qrcode` → canvas → data URL), 6-digit verification input, backup codes one-time reveal with copy/download, disable flow |
| `components/mfa-status.tsx` | **New** | Read-only status card: "Two-factor authentication is enabled" with enabled-since date, disable button |
| `app/(internal)/profile/page.tsx` | Edit | Add TOTP section (setup or status, gated by `hasLocalPassword`) |
| `app/(internal)/settings/limits-form.tsx` | Edit | Add `requireTotp` toggle row with confirmation dialog (shows affected user count) |
| `app/(internal)/settings/actions.ts` | Edit | Gate `requireTotp` save: admin must have TOTP themselves; log audit `REQUIRE_TOTP_ENABLED`/`REQUIRE_TOTP_DISABLED` |
| `app/(internal)/settings/page.tsx` | Edit | Pass `requireTotp` + `usersWithoutTotpCount` to LimitsForm |
| `prisma/schema.prisma` | Edit | Add 4 columns to User |
| `prisma/migrations/` | **New** | Migration adding `totpSecret`, `totpEnabled`, `totpBackupCodes`, `totpVerifiedAt`, `totpEnabledAt` to User |
| `prisma/seed.ts` | Edit | Seed defaults for `requireTotp` (already handled by zod `.default(false)` on schema) |
| `lib/openapi.json` | Edit | No new endpoints — TOTP flow is server-actions only. No spec change. |

---

## Dependencies

| Package | Role | Size |
|---|---|---|
| `otplib` | TOTP generation and verification (pure JS) | ~30 KB gzipped |
| `qrcode` | QR code rendering to canvas / data URL (pure JS) | ~35 KB gzipped |

Both are well-maintained, zero native dependencies, and work in Node.js and the browser.

---

## RBAC

| Action | Permission |
|---|---|
| Self-service TOTP setup / disable | `PROFILE_EDIT` (existing) |
| View Profile page (forced enrollment landing) | Always allowed — universal access |
| Admin reset another user's MFA | `USERS_MANAGE` (existing) |
| Admin toggle `requireTotp` on/off | `SETTINGS_MANAGE` (existing) |

No new permission keys needed.

---

## Tests

| Test file | Coverage |
|---|---|
| `lib/mfa.test.ts` | TOTP generation + verification (valid code, invalid code, expired window), backup code generation + verification + consumption, challenge cookie encrypt/decrypt, trust token sign/verify + expiry |
| `lib/db/users.test.ts` | Extended: `saveTotpSecret`, `enableTotp`, `disableTotp`, `consumeBackupCode`, `clearTotp`, `countUsersWithoutTotp` |
| `lib/auth.test.ts` | Extended: `authorize` with valid/invalid/expired `mfaPayload`; session callback with `totpSetupRequired` permission narrowing |
| `e2e/mfa.spec.ts` | Full MFA login flow (setup → login with TOTP → dashboard), backup code login + re-enrollment prompt, invalid code rejection, verify-page rate limiting, org-wide forced enrollment (admin enables → user forced to setup → then logs in normally), admin reset MFA from Users tab |
| `app/(auth)/login/login-form.test.tsx` | Extended: redirect to `/login/verify` when user has TOTP enabled; redirect to `/profile?setup=mfa` when `requireTotp` is on and user has no TOTP |

---

## Gate checklist

- [ ] User can set up TOTP from Profile — QR code displayed, verification code accepted, backup codes shown once
- [ ] User can disable TOTP from Profile (requires current password)
- [ ] Login flow unchanged for users without TOTP when `requireTotp` is off
- [ ] Login redirects to `/login/verify` when user has TOTP enabled
- [ ] Correct TOTP code logs user in; incorrect code shows error (with rate limiting)
- [ ] Backup code logs user in + prompts re-enrollment; used/expired backup code rejected
- [ ] Verify page rate-limited (5 attempts per 60 seconds per challenge cookie)
- [ ] Admin toggles `requireTotp` ON → rejected if admin lacks TOTP themselves
- [ ] Admin toggles `requireTotp` ON → confirmation dialog shows affected user count → saves
- [ ] User without TOTP logs in when `requireTotp` is on → forced to `/profile?setup=mfa`
- [ ] User completes TOTP setup → session restores full permissions → redirected to `/dashboard`
- [ ] SSO-only users never see TOTP UI and are never forced (even when `requireTotp` is on)
- [ ] Admin resets a user's MFA from Settings → Users tab (audit logged)
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test` clean
- [ ] Migration applies cleanly on fresh database
- [ ] e2e passes against production build (`npm run start`)

---

## Out of scope (future)

- Hardware security keys (WebAuthn / FIDO2)
- "Remember this device for 30 days" trust
- SMS / email as second factor
- TOTP grace period with countdown (current model: immediate enforcement on next login)
- Per-role MFA exemption list
- MFA for API key authentication (API keys are bearer tokens with their own expiry, revocation, and IP allowlisting)
