# SSO configuration guide

> See also: [SSO Configuration](./docs/configuration/sso.md) in the VitePress documentation site.

This guide explains how to connect **Mitch‑Risk** to a Single Sign-On (SSO) identity provider
(IdP) so internal staff can sign in with their organisation account instead of a local
email/password.

Mitch‑Risk supports three sign-in integrations, all configured in-app under
**Settings → SSO** (requires the **Settings: manage** permission):

| Integration | Use it for |
|---|---|
| **Microsoft Entra ID** | Azure AD / Microsoft 365 / "Azure Enterprise App" |
| **Google Workspace** | Google Workspace (Gmail-for-business) accounts |
| **Custom OIDC** | Any OpenID Connect provider — Auth0, Keycloak, Authentik, Authelia, VoidAuth, Okta, etc. |

All three can be enabled at once; each appears as its own button on the login screen.

---

## 1. How SSO works in Mitch‑Risk

- **Standard OIDC / OAuth 2.0.** Mitch‑Risk is the *relying party*; your IdP is the
  *authorization server*. Sign-in uses the OpenID Connect Authorization Code flow.
- **Just-in-time user provisioning.** The first time someone signs in via SSO, Mitch‑Risk
  creates a local user for them (or links to an existing local user **with the same email
  address**) and assigns the **Default role for new SSO users** (falls back to *Reviewer* if
  unset). Change a user's role afterwards under **Settings → Users**.
- **Email is the identity key.** Your IdP **must** return an `email` claim. It is used to
  provision/link the account and to enforce the optional domain restriction.
- **Domain restriction (optional).** *Restrict to domain* rejects any SSO login whose email
  domain doesn't match (e.g. `example.com`).
- **Credentials stay with the IdP.** SSO-provisioned users have no local password. Their
  **Profile** page hides the password section and shows their email as read-only (they can
  still edit their display name), and the "Forgot password?" flow never issues a reset link for
  them — password and email are managed entirely by the identity provider. Users who also have
  a local password (e.g. an existing local account later linked to SSO) keep normal password
  management.
- **Secrets are encrypted at rest.** Client secrets are stored encrypted (AES-256-GCM via
  `APP_ENCRYPTION_KEY`) and never shown again after saving.
- **SSO-only mode + break-glass.** You can *Disable email/password sign-in* so only SSO
  buttons show — provided at least one SSO provider is enabled (a safety guard prevents
  lock-out). Generate a **break-glass URL** first; it re-reveals the local login form for
  emergency admin access if SSO is unavailable.

---

## 2. Before you start

1. **Set a public HTTPS URL.** `APP_URL` (env) must be your real public origin, e.g.
   `https://risk.example.com`. This determines the redirect/callback URL your IdP must trust.
   See the "Running behind a reverse proxy" section of the [README](./README.md).
2. **You need admin access** to both Mitch‑Risk (an Admin account) and your IdP.
3. **Know your redirect URI.** Each integration has a fixed callback path:

   | Integration | Redirect / callback URL to register at the IdP |
   |---|---|
   | Microsoft Entra ID | `https://YOUR_DOMAIN/api/auth/callback/microsoft-entra-id` |
   | Google Workspace | `https://YOUR_DOMAIN/api/auth/callback/google` |
   | Custom OIDC | `https://YOUR_DOMAIN/api/auth/callback/oidc` |

   Replace `YOUR_DOMAIN` with your `APP_URL` host. Use `https://` in production — most IdPs
   reject plain-HTTP redirect URIs for anything other than `localhost`.

4. **Required scopes/claims:** `openid`, `profile`, `email`. Mitch‑Risk reads `sub`
   (stable ID), `email`, and `name` (or `preferred_username`).

---

## 3. In-app configuration (all providers)

1. Sign in to Mitch‑Risk as an Admin → **Settings → SSO**.
2. Fill in the fields for your chosen provider (see per-provider sections below).
3. Set **Default role for new SSO users** (e.g. *Reviewer*).
4. (Optional) Set **Restrict to domain** to your email domain.
5. Click **Save SSO**.
6. Sign out and confirm the provider button appears on the login page, then test a login.
7. (Optional, once verified) enable **Disable email/password sign-in** — but **generate a
   break-glass URL first** and store it somewhere safe.

---

## 4. Microsoft Entra ID (Azure "Enterprise App")

In Azure, you create an **App registration** (it also appears under *Enterprise applications*).

1. **Azure Portal → Microsoft Entra ID → App registrations → New registration.**
   - Name: `Mitch‑Risk`.
   - Supported account types: choose per your needs (single-tenant is typical for internal
     staff).
   - Redirect URI: platform **Web**, value
     `https://YOUR_DOMAIN/api/auth/callback/microsoft-entra-id`.
2. Copy the **Application (client) ID**.
3. **Certificates & secrets → New client secret** → copy the secret **Value** (not the ID).
4. **API permissions**: the Microsoft Graph delegated `openid`, `profile`, `email`, `User.Read`
   permissions are sufficient (present by default). Grant admin consent if prompted.
5. In Mitch‑Risk **Settings → SSO → Microsoft Entra ID**:
   - Tick **Enabled**.
   - **Client ID** = Application (client) ID.
   - **Client secret** = the secret Value.
   - Save.

> **Tenant scope:** the built-in Entra integration uses Microsoft's multi-tenant `common`
> endpoint. To restrict to your organisation, set **Restrict to domain** to your tenant's
> email domain, or use the **Custom OIDC** integration (Section 6) with your tenant issuer
> `https://login.microsoftonline.com/<tenant-id>/v2.0` for a hard single-tenant lock.

---

## 5. Google Workspace

1. **Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID.**
2. Configure the **OAuth consent screen** first if prompted (Internal user type keeps it to
   your Workspace).
3. Application type: **Web application**.
   - Authorised redirect URI: `https://YOUR_DOMAIN/api/auth/callback/google`.
4. Copy the **Client ID** and **Client secret**.
5. In Mitch‑Risk **Settings → SSO → Google Workspace**:
   - Tick **Enabled**, paste **Client ID** and **Client secret**, Save.
6. To limit sign-in to your company, set **Restrict to domain** (e.g. `example.com`).

---

## 6. Custom OIDC (Auth0, Keycloak, Authentik, Authelia, VoidAuth, Okta, …)

Use this for any standards-compliant OpenID Connect provider. You need three things from your
IdP: an **Issuer URL**, a **Client ID**, and a **Client secret**, and you must register the
redirect URI `https://YOUR_DOMAIN/api/auth/callback/oidc`.

### 6.1 Finding your Issuer URL

The **Issuer URL** is the base URL that hosts your provider's discovery document. Mitch‑Risk
appends `/.well-known/openid-configuration` automatically. To verify, open:

```
<ISSUER_URL>/.well-known/openid-configuration
```

It must return JSON, and the `"issuer"` value in that JSON must **exactly** match what you
enter (including/excluding a trailing slash as the provider specifies).

### 6.2 In-app fields (Settings → SSO → Custom OIDC)

- **Enabled**: ticked.
- **Provider display name**: what the login button says, e.g. "Company SSO", "Keycloak".
- **Issuer URL**: from 6.1.
- **Client ID** / **Client secret**: from your IdP's application/client.

### 6.3 Provider-specific notes

Register redirect URI `https://YOUR_DOMAIN/api/auth/callback/oidc` in **every** case, request
scopes `openid profile email`, and use the **Confidential/Web** (client-secret) client type.

**Auth0**
- Create a **Regular Web Application**.
- *Allowed Callback URLs*: `https://YOUR_DOMAIN/api/auth/callback/oidc`.
- Issuer URL: `https://YOUR_TENANT.<region>.auth0.com/` (include the trailing slash; copy the
  exact `issuer` from the discovery doc).
- Client ID / Secret: from the application's Settings.

**Keycloak**
- Create a **Client** (type OpenID Connect, *Client authentication* ON = confidential).
- *Valid redirect URIs*: `https://YOUR_DOMAIN/api/auth/callback/oidc`.
- Issuer URL: `https://KEYCLOAK_HOST/realms/YOUR_REALM`.
- Client ID = the client's Client ID; Client secret from the **Credentials** tab.

**Authentik**
- Create an **OAuth2/OpenID Provider**, then an **Application** bound to it.
- Redirect URI: `https://YOUR_DOMAIN/api/auth/callback/oidc`.
- Client type: **Confidential**.
- Issuer URL: `https://AUTHENTIK_HOST/application/o/YOUR_APP_SLUG/` (per-application issuer;
  confirm via its `.well-known` URL).
- Client ID / Secret: from the provider page.

**Authelia**
- Add an OIDC client under `identity_providers.oidc.clients` in Authelia's config
  (confidential client with a hashed secret).
  - `redirect_uris`: `https://YOUR_DOMAIN/api/auth/callback/oidc`
  - `scopes`: `openid`, `profile`, `email`
- Issuer URL: your Authelia root, e.g. `https://auth.example.com`.
- Client ID: the `client_id` you set; Client secret: the plaintext secret (Authelia stores its
  hash).

**VoidAuth**
- In VoidAuth, create an OIDC client / application.
  - Redirect URI: `https://YOUR_DOMAIN/api/auth/callback/oidc`
  - Scopes: `openid profile email`
- Issuer URL: your VoidAuth base URL (verify with its `.well-known/openid-configuration`).
- Copy the generated Client ID and Client secret.

**Okta**
- Create an **OIDC → Web Application**.
- *Sign-in redirect URI*: `https://YOUR_DOMAIN/api/auth/callback/oidc`.
- Issuer URL: `https://YOUR_ORG.okta.com` (or a custom auth server:
  `https://YOUR_ORG.okta.com/oauth2/YOUR_AUTH_SERVER_ID`).
- Client ID / Secret: from the app's General tab.

**Any other OIDC provider**
- Register a confidential web client with redirect URI
  `https://YOUR_DOMAIN/api/auth/callback/oidc` and scopes `openid profile email`.
- Set the Issuer URL to the `issuer` value from its discovery document. If the provider only
  offers OAuth2 without OpenID Connect discovery, it is **not** supported by the Custom OIDC
  integration.

---

## 7. Enabling SSO-only sign-in (optional)

Once at least one provider works:

1. **Settings → SSO → Break-glass access → Generate break-glass URL.** Copy and store it
   securely (it is shown once). This URL re-enables the local login form if SSO breaks.
2. Tick **Disable email/password sign-in (SSO only)** and **Save SSO**.
3. The login page now shows only SSO buttons. Local login remains reachable at the break-glass
   URL, and is automatically kept available if no SSO provider is enabled (anti-lock-out).

---

## 8. Testing & troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| **redirect_uri mismatch / invalid redirect** | The URI at the IdP must exactly equal `https://YOUR_DOMAIN/api/auth/callback/<provider>` — check scheme (`https`), host, and no trailing slash. Confirm `APP_URL` matches your public host. |
| **`invalid_redirect_uri` and the redirect shows `localhost:3000`** | Auth.js is deriving the wrong host. Set `APP_URL` to your public HTTPS origin (it feeds `AUTH_URL` by default), and restart. Also configure your reverse proxy to preserve the original `Host` (or send `X-Forwarded-Host`). If auth must use a different origin than `APP_URL`, set `AUTH_URL` explicitly. |
| **Button doesn't appear on login page** | Provider not *Enabled*, or a required field is blank (Custom OIDC needs **both** Issuer URL and Client ID). Re-save. |
| **"Configuration" / discovery error (OIDC)** | Issuer URL wrong. Open `<ISSUER>/.well-known/openid-configuration` in a browser; use the exact `issuer` value it returns. |
| **Login succeeds at IdP but bounces back / access denied** | *Restrict to domain* is set and the account's email domain doesn't match; or the IdP didn't return an `email` claim (add the `email` scope/claim mapping). |
| **Cookies not set / stuck on login behind a proxy** | Your reverse proxy must forward `X-Forwarded-Proto: https` and the host header so auth issues secure cookies. See the README proxy section; optionally set `AUTH_URL`. |
| **New SSO user has the wrong permissions** | They received the *Default role for new SSO users*. Adjust it, or change the user's role under **Settings → Users**. |
| **Locked out after enabling SSO-only** | Use the break-glass URL to sign in locally, then fix the SSO config. |

### Security notes
- Client secrets are encrypted at rest and never returned to the browser; re-enter a secret
  only when rotating it (leaving it blank keeps the current one).
- Break-glass tokens are bcrypt-hashed and stored as a JSON object with expiry and consumed flag. Tokens expire 24 hours after generation and are single-use (consumed on first successful verification). Regenerate to issue a new URL.
- SSO users authenticate against your IdP — Mitch‑Risk never sees their IdP password.
