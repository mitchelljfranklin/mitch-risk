import { describe, expect, it } from "vitest";

import { resolveClientIp } from "@/lib/client-ip";

function headersFrom(values: Record<string, string>): Headers {
  return new Headers(values);
}

describe("resolveClientIp", () => {
  it("trusts the rightmost hop and ignores a client-spoofed leftmost value", () => {
    const headers = headersFrom({
      "x-forwarded-for": "9.9.9.9, 1.1.1.1",
    });
    expect(resolveClientIp(headers, { trustedProxyCount: 1 })).toBe("1.1.1.1");
  });

  it("walks back the configured number of trusted proxy hops", () => {
    const headers = headersFrom({
      "x-forwarded-for": "9.9.9.9, 1.1.1.1, 2.2.2.2",
    });
    expect(resolveClientIp(headers, { trustedProxyCount: 2 })).toBe("1.1.1.1");
  });

  it("returns the only entry when there is a single hop", () => {
    const headers = headersFrom({ "x-forwarded-for": "1.1.1.1" });
    expect(resolveClientIp(headers, { trustedProxyCount: 1 })).toBe("1.1.1.1");
  });

  it("clamps when the trusted proxy count exceeds the number of hops", () => {
    const headers = headersFrom({ "x-forwarded-for": "1.1.1.1" });
    expect(resolveClientIp(headers, { trustedProxyCount: 3 })).toBe("1.1.1.1");
  });

  it("ignores X-Forwarded-For entirely when no proxy is trusted", () => {
    const headers = headersFrom({ "x-forwarded-for": "9.9.9.9" });
    expect(resolveClientIp(headers, { trustedProxyCount: 0 })).toBe("unknown");
  });

  it("strips an IPv4 port suffix", () => {
    const headers = headersFrom({ "x-forwarded-for": "203.0.113.5:41234" });
    expect(resolveClientIp(headers, { trustedProxyCount: 1 })).toBe(
      "203.0.113.5",
    );
  });

  it("unwraps a bracketed IPv6 address with a port", () => {
    const headers = headersFrom({
      "x-forwarded-for": "[2001:db8::1]:443",
    });
    expect(resolveClientIp(headers, { trustedProxyCount: 1 })).toBe(
      "2001:db8::1",
    );
  });

  it("leaves a bare IPv6 address untouched", () => {
    const headers = headersFrom({ "x-forwarded-for": "2001:db8::1" });
    expect(resolveClientIp(headers, { trustedProxyCount: 1 })).toBe(
      "2001:db8::1",
    );
  });

  it("prefers an explicit client IP header when configured", () => {
    const headers = headersFrom({
      "cf-connecting-ip": "203.0.113.9",
      "x-forwarded-for": "9.9.9.9, 1.1.1.1",
    });
    expect(
      resolveClientIp(headers, {
        trustedProxyCount: 1,
        clientIpHeader: "cf-connecting-ip",
      }),
    ).toBe("203.0.113.9");
  });

  it("falls back to the configured header value then X-Forwarded-For", () => {
    const headers = headersFrom({ "x-forwarded-for": "9.9.9.9, 1.1.1.1" });
    expect(
      resolveClientIp(headers, {
        trustedProxyCount: 1,
        clientIpHeader: "cf-connecting-ip",
      }),
    ).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip when X-Forwarded-For is absent", () => {
    const headers = headersFrom({ "x-real-ip": "198.51.100.7" });
    expect(resolveClientIp(headers, { trustedProxyCount: 1 })).toBe(
      "198.51.100.7",
    );
  });

  it("returns 'unknown' when no usable header is present", () => {
    const headers = headersFrom({});
    expect(resolveClientIp(headers, { trustedProxyCount: 1 })).toBe("unknown");
  });
});
