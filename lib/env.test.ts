import { describe, expect, it } from "vitest";

import { deriveAuthUrl } from "@/lib/env";

describe("deriveAuthUrl", () => {
  it("falls back to APP_URL when AUTH_URL is unset", () => {
    expect(deriveAuthUrl(undefined, "https://risk.example.com")).toBe(
      "https://risk.example.com",
    );
  });

  it("falls back to APP_URL when AUTH_URL is empty or whitespace", () => {
    expect(deriveAuthUrl("", "https://risk.example.com")).toBe(
      "https://risk.example.com",
    );
    expect(deriveAuthUrl("   ", "https://risk.example.com")).toBe(
      "https://risk.example.com",
    );
  });

  it("keeps an explicit AUTH_URL and trims it", () => {
    expect(
      deriveAuthUrl("https://auth.example.com", "https://risk.example.com"),
    ).toBe("https://auth.example.com");
    expect(
      deriveAuthUrl("  https://auth.example.com  ", "https://risk.example.com"),
    ).toBe("https://auth.example.com");
  });
});
