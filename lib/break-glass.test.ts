import { describe, expect, it } from "vitest";

import {
  generateBreakGlassToken,
  hashBreakGlassToken,
  shouldShowLocalAuth,
  verifyBreakGlassToken,
} from "@/lib/break-glass";

describe("break-glass token", () => {
  it("generates unique 48-char hex tokens", () => {
    const first = generateBreakGlassToken();
    const second = generateBreakGlassToken();
    expect(first).toMatch(/^[0-9a-f]{48}$/);
    expect(first).not.toBe(second);
  });

  it("verifies a token against its hash and rejects the wrong token", async () => {
    const token = generateBreakGlassToken();
    const hash = await hashBreakGlassToken(token);
    expect(await verifyBreakGlassToken(token, hash)).toBe(true);
    expect(await verifyBreakGlassToken("wrong", hash)).toBe(false);
    expect(await verifyBreakGlassToken("", hash)).toBe(false);
    expect(await verifyBreakGlassToken(token, "")).toBe(false);
  });
});

describe("shouldShowLocalAuth", () => {
  it("shows local auth when it is not disabled", () => {
    expect(
      shouldShowLocalAuth({
        disableLocalAuth: false,
        ssoProviderCount: 2,
        breakGlassValid: false,
      }),
    ).toBe(true);
  });

  it("keeps local auth visible when disabled but no SSO provider is enabled", () => {
    expect(
      shouldShowLocalAuth({
        disableLocalAuth: true,
        ssoProviderCount: 0,
        breakGlassValid: false,
      }),
    ).toBe(true);
  });

  it("hides local auth when disabled with SSO enabled and no valid break-glass token", () => {
    expect(
      shouldShowLocalAuth({
        disableLocalAuth: true,
        ssoProviderCount: 1,
        breakGlassValid: false,
      }),
    ).toBe(false);
  });

  it("reveals local auth via a valid break-glass token", () => {
    expect(
      shouldShowLocalAuth({
        disableLocalAuth: true,
        ssoProviderCount: 1,
        breakGlassValid: true,
      }),
    ).toBe(true);
  });
});
