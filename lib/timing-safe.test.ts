import { describe, expect, it } from "vitest";

import { timingSafeEqualString } from "@/lib/timing-safe";

describe("timingSafeEqualString", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqualString("s3cr3t-value", "s3cr3t-value")).toBe(true);
  });

  it("returns false for differing strings of equal length", () => {
    expect(timingSafeEqualString("aaaaaa", "aaaaab")).toBe(false);
  });

  it("returns false for differing lengths without throwing", () => {
    expect(timingSafeEqualString("short", "a-much-longer-secret")).toBe(false);
  });

  it("returns false when either side is missing", () => {
    expect(timingSafeEqualString(null, "x")).toBe(false);
    expect(timingSafeEqualString("x", undefined)).toBe(false);
    expect(timingSafeEqualString("", "")).toBe(false);
  });
});
