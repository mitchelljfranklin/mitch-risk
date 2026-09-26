// Back-compat mapping from the old /settings?tab=<value> URLs to their new
// /admin/<section> routes. The /settings page uses this to redirect deep
// links (audit entity links, bookmarks, older e2e specs) without breaking.

export const SETTINGS_TAB_REDIRECTS: Readonly<Record<string, string>> = {
  general: "/admin/general",
  appearance: "/admin/appearance",
  email: "/admin/email",
  "email-tracking": "/admin/email-tracking",
  scoring: "/admin/scoring",
  scheduling: "/admin/scheduling",
  storage: "/admin/storage",
  users: "/admin/users",
  roles: "/admin/roles",
  api: "/admin/api",
  webhooks: "/admin/webhooks",
  "trust-center": "/admin/trust-center",
  audit: "/admin/audit",
  health: "/admin/health",
  // The old grab-bag "limits" tab: rate limits are its largest, most
  // targeted group. Session/login limits moved to sign-in, uploads to
  // storage, and each retention policy to its feature page.
  limits: "/admin/rate-limits",
  sso: "/admin/sign-in",
};

export function resolveSettingsTabHref(tab: string | undefined): string | null {
  if (!tab) return null;
  return SETTINGS_TAB_REDIRECTS[tab] ?? null;
}
