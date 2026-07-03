const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 50_000;
const SWEEP_INTERVAL_MS = 60_000;

let lastSweepAt = 0;

function getKey(namespace: string, identifier: string): string {
  return `${namespace}:${identifier}`;
}

function sweepExpired(now: number): void {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) {
    return;
  }
  lastSweepAt = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

function evictOldestIfFull(): void {
  if (store.size < MAX_TRACKED_KEYS) {
    return;
  }
  const oldestKey = store.keys().next().value;
  if (oldestKey !== undefined) {
    store.delete(oldestKey);
  }
}

export function rateLimit(
  namespace: string,
  identifier: string,
  limit: number,
): boolean {
  const key = getKey(namespace, identifier);
  const now = Date.now();

  sweepExpired(now);

  const entry = store.get(key);
  if (!entry || now >= entry.resetAt) {
    evictOldestIfFull();
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
  lastSweepAt = 0;
}

export function getRateLimitStoreSize(): number {
  return store.size;
}
