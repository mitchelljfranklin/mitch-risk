import { describe, expect, it } from "vitest";

import { computeSessionExpiry } from "@/lib/session";

describe("computeSessionExpiry", () => {
  it("returns a future unix timestamp when timeout is positive", () => {
    const result = computeSessionExpiry(30);
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(result).toBeDefined();
    expect(result! - nowSeconds).toBeGreaterThanOrEqual(30 * 60 - 1);
    expect(result! - nowSeconds).toBeLessThanOrEqual(30 * 60 + 1);
  });

  it("returns undefined when timeout is zero", () => {
    expect(computeSessionExpiry(0)).toBeUndefined();
  });

  it("returns undefined when timeout is negative", () => {
    expect(computeSessionExpiry(-1)).toBeUndefined();
  });
});
