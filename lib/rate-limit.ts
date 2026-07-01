const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;

function getKey(namespace: string, identifier: string): string {
  return `${namespace}:${identifier}`;
}

export function rateLimit(
  namespace: string,
  identifier: string,
  limit: number,
): boolean {
  const key = getKey(namespace, identifier);
  const now = Date.now();

  const entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count < limit) {
    entry.count += 1;
    return true;
  }

  return false;
}

export function resetRateLimitStore(): void {
  store.clear();
}
