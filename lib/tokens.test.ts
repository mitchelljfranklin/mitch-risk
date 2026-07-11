import { describe, expect, it } from "vitest";

import { generateAccessToken, hashToken, expiryFromNow } from "@/lib/tokens";

describe("tokens", () => {
  describe("generateAccessToken", () => {
    it("returns a non-empty string", () => {
      const token = generateAccessToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
    });

    it("returns a base64url string (no +, /, or = characters)", () => {
      const token = generateAccessToken();
      expect(token).not.toContain("+");
      expect(token).not.toContain("/");
      expect(token).not.toContain("=");
    });

    it("returns a token at least 43 characters long (32 bytes in base64url)", () => {
      const token = generateAccessToken();
      expect(token.length).toBeGreaterThanOrEqual(43);
    });

    it("produces unique tokens on repeated calls", () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateAccessToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe("hashToken", () => {
    it("returns a 64-character hex string", () => {
      const hash = hashToken("test-token");
      expect(hash).toHaveLength(64);
      expect(/^[0-9a-f]+$/i.test(hash)).toBe(true);
    });

    it("is deterministic — same input produces same hash", () => {
      expect(hashToken("abc")).toBe(hashToken("abc"));
    });

    it("produces different hashes for different inputs", () => {
      expect(hashToken("abc")).not.toBe(hashToken("def"));
    });

    it("handles empty string input", () => {
      const hash = hashToken("");
      expect(hash).toHaveLength(64);
    });
  });

  describe("expiryFromNow", () => {
    it("returns a Date in the future when given positive days", () => {
      const now = new Date("2026-07-01T00:00:00Z");
      const expiry = expiryFromNow(30, now);
      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it("returns exactly 30 days from now by default", () => {
      const now = new Date("2026-07-01T00:00:00Z");
      const expiry = expiryFromNow(undefined, now);
      const diffDays =
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(30);
    });

    it("returns exactly the specified number of days", () => {
      const now = new Date("2026-07-01T00:00:00Z");
      const expiry = expiryFromNow(7, now);
      const diffDays =
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    });

    it("handles zero days (returns the same date)", () => {
      const now = new Date("2026-07-01T12:00:00Z");
      const expiry = expiryFromNow(0, now);
      expect(expiry.getTime()).toBe(now.getTime());
    });

    it("uses the current time when now is not provided", () => {
      const before = new Date();
      const expiry = expiryFromNow(1);
      const after = new Date();
      expect(expiry.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(expiry.getTime()).toBeLessThanOrEqual(
        after.getTime() + 24 * 60 * 60 * 1000,
      );
    });
  });
});
