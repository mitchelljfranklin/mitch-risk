import { describe, expect, it } from "vitest";

import { hasLocalPassword } from "@/lib/db/users";

describe("hasLocalPassword", () => {
  it("returns true for a real bcrypt hash", () => {
    expect(
      hasLocalPassword("$2a$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG"),
    ).toBe(true);
  });

  it("returns false for an empty or whitespace hash (SSO-provisioned user)", () => {
    expect(hasLocalPassword("")).toBe(false);
    expect(hasLocalPassword("   ")).toBe(false);
  });
});
