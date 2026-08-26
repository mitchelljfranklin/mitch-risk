export function buildBackParam(
  path: string,
  searchParams: Record<string, string | undefined>,
  keys: string[],
): string {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = searchParams[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  const returnPath = query ? `${path}?${query}` : path;
  return `?back=${encodeURIComponent(returnPath)}`;
}

export function resolveBackHref(
  back: string | undefined,
  prefix: string,
  fallback: string,
): string {
  const matchesPrefix = back === prefix || back?.startsWith(`${prefix}?`);
  return back && matchesPrefix ? back : fallback;
}

export function resolveTab(
  rawTab: string | null,
  allowedTabs: string[],
  defaultTab: string,
): string {
  return rawTab && allowedTabs.includes(rawTab) ? rawTab : defaultTab;
}

// Serialises active filter values into a query-string fragment so paginated
// tables can carry their filters through page links. Empty/undefined values
// are skipped; returns "" when nothing is set.
export function buildFilterQueryString(
  filters: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      params.set(name, value);
    }
  }
  return params.toString();
}
