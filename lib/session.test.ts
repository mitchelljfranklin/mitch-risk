import { describe, expect, it } from "vitest";

import { computeSessionExpiry } from "@/lib/session";

describe("session", () => {
  describe("computeSessionExpiry", () => {
    it("returns undefined when sessionTimeoutMinutes is 0", () => {
      expect(computeSessionExpiry(0)).toBeUndefined();
    });

    it("returns undefined when sessionTimeoutMinutes is negative", () => {
      expect(computeSessionExpiry(-1)).toBeUndefined();
    });

    it("returns a future timestamp when given a positive value", () => {
      const before = Math.floor(Date.now() / 1000);
      const expiry = computeSessionExpiry(30);
      const after = Math.floor(Date.now() / 1000) + 1;

      expect(expiry).toBeDefined();
      if (expiry !== undefined) {
        expect(expiry).toBeGreaterThanOrEqual(before);
        expect(expiry).toBeLessThanOrEqual(after + 30 * 60);
      }
    });

    it("returns a timestamp exactly 30 minutes from now", () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiry = computeSessionExpiry(30);
      expect(expiry).toBeDefined();
      if (expiry !== undefined) {
        const diffSeconds = expiry - nowSeconds;
        expect(diffSeconds).toBeGreaterThanOrEqual(30 * 60 - 1);
        expect(diffSeconds).toBeLessThanOrEqual(30 * 60 + 1);
      }
    });

    it("returns a timestamp exactly 1 minute from now", () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiry = computeSessionExpiry(1);
      expect(expiry).toBeDefined();
      if (expiry !== undefined) {
        const diffSeconds = expiry - nowSeconds;
        expect(diffSeconds).toBeGreaterThanOrEqual(59);
        expect(diffSeconds).toBeLessThanOrEqual(61);
      }
    });
  });
});
