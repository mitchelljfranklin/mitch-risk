# SSO Configuration

> See also: [SSOConfig.md](https://github.com/mitchelljfranklin/mitch-risk/blob/master/SSOConfig.md) in the repo root for provider-specific setup guides (Auth0, Keycloak, Authentik, Authelia, VoidAuth, Okta).

Mitch‑Risk supports Single Sign-On for internal staff via **Microsoft Entra ID**, **Google Workspace**, and any **generic OIDC** provider. All configuration is done in-app under **Settings → SSO** (requires the **Settings: manage** permission).

All three providers can be enabled at once; each appears as its own button on the login screen.

## How SSO works

- **Standard OIDC / OAuth 2.0.** Mitch‑Risk is the relying party; your IdP is the authorization server. Uses the Authorization Code flow.
- **Just-in-time provisioning.** First SSO login creates a local user linked to the IdP email, assigned the default role (falls back to Reviewer). Change a user's role later under **Settings → Users**.
- **Email is the identity key.** Your IdP must return an `email` claim. It provisions/links the account and enforces optional domain restriction.
- **Domain restriction.** Optional — rejects logins whose email domain doesn't match (e.g. `example.com`).
- **No local password.** SSO-provisioned users have no password. Their profile page hides the password section and shows read-only email. Password reset flow skips SSO-only accounts.
- **Secrets encrypted at rest.** Client secrets stored with AES-256-GCM via `APP_ENCRYPTION_KEY`, never shown again after saving.
- **SSO-only mode + break-glass.** You can disable email/password sign-in (must have at least one SSO provider enabled). Generate a break-glass URL first — it re-reveals the local login form for emergency access.

## Prerequisites

1. **Set a public HTTPS URL.** `APP_URL` must be your real origin (e.g. `https://risk.example.com`). This determines the callback/redirect URI.
2. **Admin access** to both Mitch‑Risk and your IdP.
3. **Know your redirect URI:**

| Integration | Callback URL |
|---|---|
| Microsoft Entra ID | `https://YOUR_DOMAIN/api/auth/callback/microsoft-entra-id` |
| Google Workspace | `https://YOUR_DOMAIN/api/auth/callback/google` |
| Custom OIDC | `https://YOUR_DOMAIN/api/auth/callback/oidc` |

4. **Required scopes:** `openid`, `profile`, `email`. The provider must return `sub` (stable ID), `email`, and `name`.

## In-app setup (all providers)

1. Sign in as Admin → **Settings → SSO**
2. Fill in fields for your provider (see sections below)
3. Set **Default role for new SSO users** (e.g. Reviewer)
4. (Optional) Set **Restrict to domain**
5. Click **Save SSO**
6. Sign out and confirm the provider button appears, then test a login
7. (Optional) enable **Disable email/password sign-in** — **generate a break-glass URL first**

## Microsoft Entra ID

1. **Azure Portal → Microsoft Entra ID → App registrations → New registration**
   - Name: `Mitch‑Risk`
   - Redirect URI: Web, `https://YOUR_DOMAIN/api/auth/callback/microsoft-entra-id`
2. Copy the **Application (client) ID**
3. **Certificates & secrets → New client secret** — copy the Value
4. In Mitch‑Risk **Settings → SSO → Microsoft Entra ID**: tick Enabled, paste Client ID and Client secret, Save

> The built-in Entra integration uses Microsoft's multi-tenant `common` endpoint. To restrict to your organisation, set **Restrict to domain** to your tenant's email domain, or use **Custom OIDC** with your tenant issuer `https://login.microsoftonline.com/<tenant-id>/v2.0`.

## Google Workspace

1. **Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID**
2. Configure OAuth consent screen (Internal user type keeps it to your Workspace)
3. Application type: **Web application**, redirect URI: `https://YOUR_DOMAIN/api/auth/callback/google`
4. In Mitch‑Risk **Settings → SSO → Google Workspace**: tick Enabled, paste Client ID and Client secret, Save
5. To limit sign-in to your company, set **Restrict to domain**

## Custom OIDC

Use for any OpenID Connect provider (Auth0, Keycloak, Authentik, Authelia, VoidAuth, Okta, etc.).

**Finding your Issuer URL:** it's the base URL hosting your provider's discovery document. Verify by opening `<ISSUER>/.well-known/openid-configuration` — it must return JSON with a matching `issuer` value.

**In-app fields:**
- **Enabled**: ticked
- **Provider display name**: login button text (e.g. "Company SSO")
- **Issuer URL**: from discovery document
- **Client ID / Client secret**: from your IdP's application/client

### Provider-specific notes

**Auth0**: Regular Web Application, Issuer = `https://YOUR_TENANT.<region>.auth0.com/`

**Keycloak**: Confidential OpenID Connect client, Issuer = `https://KEYCLOAK_HOST/realms/YOUR_REALM`

**Authentik**: OAuth2/OpenID Provider → Application (Confidential), per-app issuer

**Authelia**: OIDC client with `redirect_uris: https://YOUR_DOMAIN/api/auth/callback/oidc`

**VoidAuth**: OIDC client, standard callback + Issuer URL

**Okta**: OIDC Web Application, Issuer = `https://YOUR_ORG.okta.com`

**Other OIDC providers**: Register a confidential web client with the same callback URI and scopes.

## SSO-only mode + break-glass

Once at least one provider works:

1. **Settings → SSO → Break-glass → Generate break-glass URL** — copy and store securely (shown once). The token expires in 24 hours and is consumed on first use.
2. Tick **Disable email/password sign-in** and Save
3. Login page now shows only SSO buttons. Local login remains at the break-glass URL, and auto-keeps available if no SSO provider is enabled (anti-lock-out)

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `redirect_uri mismatch` | URI at IdP must exactly match `https://YOUR_DOMAIN/api/auth/callback/<provider>` — check https, host, no trailing slash. Confirm `APP_URL` |
| Redirect shows `localhost:3000` | Auth.js deriving wrong host. Set `APP_URL` to your public HTTPS origin. Or set `AUTH_URL` explicitly |
| Button doesn't appear | Provider not enabled, or required field blank (Custom OIDC needs both Issuer URL and Client ID) |
| Discovery error (OIDC) | Issuer URL wrong. Verify `.well-known/openid-configuration` returns valid JSON |
| Login succeeds at IdP but bounces back | Domain restriction mismatch, or IdP not returning `email` claim |
| Cookies not set behind proxy | Reverse proxy must forward `X-Forwarded-Proto: https`. See Deployment → Reverse Proxy |
| New SSO user has wrong permissions | Received the default role for new SSO users. Adjust it or change user's role under Settings → Users |
| Locked out after SSO-only | Use break-glass URL to sign in locally, then fix SSO config |
