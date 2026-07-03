import { afterEach, describe, expect, it, vi } from "vitest";

import {
  rateLimit,
  resetRateLimitStore,
  getRateLimitStoreSize,
} from "@/lib/rate-limit";

describe("rate limiter", () => {
  afterEach(() => {
    resetRateLimitStore();
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit("test", "key1", 5)).toBe(true);
    }
  });

  it("blocks requests after the limit is reached", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit("test", "key2", 3);
    }
    expect(rateLimit("test", "key2", 3)).toBe(false);
  });

  it("resets per namespace and identifier independently", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit("ns", "a", 3);
    }
    expect(rateLimit("ns", "a", 3)).toBe(false);
    expect(rateLimit("ns", "b", 3)).toBe(true);
  });

  it("resetRateLimitStore clears all entries", () => {
    for (let i = 0; i < 3; i++) {
      rateLimit("test", "key3", 3);
    }
    expect(rateLimit("test", "key3", 3)).toBe(false);
    resetRateLimitStore();
    expect(rateLimit("test", "key3", 3)).toBe(true);
  });

  it("evicts expired entries during the periodic sweep", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    rateLimit("sweep", "old", 3);
    expect(getRateLimitStoreSize()).toBe(1);

    vi.setSystemTime(new Date("2026-01-01T00:02:00Z"));
    rateLimit("sweep", "fresh", 3);
    expect(getRateLimitStoreSize()).toBe(1);
  });

  it("expired windows reset the counter for the same identifier", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    for (let i = 0; i < 3; i++) {
      rateLimit("window", "id", 3);
    }
    expect(rateLimit("window", "id", 3)).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:01:30Z"));
    expect(rateLimit("window", "id", 3)).toBe(true);
  });
});
