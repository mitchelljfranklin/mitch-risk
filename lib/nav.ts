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
  return back && back.startsWith(prefix) ? back : fallback;
}
