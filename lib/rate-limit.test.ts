import { afterEach, describe, expect, it } from "vitest";

import { rateLimit, resetRateLimitStore } from "@/lib/rate-limit";

describe("rate limiter", () => {
  afterEach(() => {
    resetRateLimitStore();
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
});
