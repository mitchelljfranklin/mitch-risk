import { redirect } from "next/navigation";

import { resolveSettingsTabHref } from "@/lib/admin-redirect";
import { buildFilterQueryString } from "@/lib/nav";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

// The settings area moved to /admin. Map legacy /settings?tab=<x> deep links
// (bookmarks, old emails, pre-rename integrations) to their new sections,
// forwarding any remaining query params (filters, pagination, error toasts).
export default async function LegacySettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const target = resolveSettingsTabHref(sp.tab) ?? "/admin";

  const { tab: _tab, ...rest } = sp;
  const forwardQuery = buildFilterQueryString(rest);

  redirect(forwardQuery ? `${target}?${forwardQuery}` : target);
}
