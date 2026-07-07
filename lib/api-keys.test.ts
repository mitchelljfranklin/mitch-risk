import { describe, expect, it } from "vitest";

import {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  isIpAllowed,
  extractKeyPrefix,
} from "@/lib/api-keys";

describe("API key generation and verification", () => {
  it("generates keys as mrk_<prefix>.<secret>", () => {
    const { fullKey, keyPrefix, displayPrefix } = generateApiKey();
    expect(fullKey.startsWith("mrk_")).toBe(true);
    expect(keyPrefix.startsWith("mrk_")).toBe(true);
    expect(keyPrefix).toBe("mrk_" + fullKey.slice(4, fullKey.indexOf(".")));
    expect(fullKey.split(".")).toHaveLength(2);
    expect(displayPrefix).toBe(`${keyPrefix}…`);
  });

  it("embeds the stored keyPrefix in the full key for lookup", () => {
    const { fullKey, keyPrefix } = generateApiKey();
    expect(extractKeyPrefix(fullKey)).toBe(keyPrefix);
  });

  it("produces unique keys and prefixes on each call", () => {
    const firstKey = generateApiKey();
    const secondKey = generateApiKey();
    expect(firstKey.fullKey).not.toBe(secondKey.fullKey);
    expect(firstKey.keyPrefix).not.toBe(secondKey.keyPrefix);
  });

  it("hashing and verification round-trips correctly", async () => {
    const { fullKey } = generateApiKey();
    const hashed = await hashApiKey(fullKey);
    expect(hashed).not.toBe(fullKey);
    expect(await verifyApiKey(fullKey, hashed)).toBe(true);
    expect(await verifyApiKey("wrong-key", hashed)).toBe(false);
  });
});

describe("extractKeyPrefix", () => {
  it("returns the prefix before the separator", () => {
    expect(extractKeyPrefix("mrk_abcd1234.secretpart")).toBe("mrk_abcd1234");
  });

  it("rejects keys without the mrk_ namespace", () => {
    expect(extractKeyPrefix("sk_abcd1234.secret")).toBeNull();
  });

  it("rejects keys without a separator", () => {
    expect(extractKeyPrefix("mrk_abcd1234secret")).toBeNull();
  });

  it("rejects keys with an empty lookup segment", () => {
    expect(extractKeyPrefix("mrk_.secret")).toBeNull();
  });
});

describe("IP allowlisting", () => {
  it("allows when no IPs are configured", () => {
    expect(isIpAllowed("", "192.168.1.1")).toBe(true);
  });

  it("matches exact IP", () => {
    expect(isIpAllowed("192.168.1.1", "192.168.1.1")).toBe(true);
    expect(isIpAllowed("192.168.1.1", "192.168.1.2")).toBe(false);
  });

  it("matches multiple IPs", () => {
    expect(isIpAllowed("192.168.1.1\n10.0.0.1", "10.0.0.1")).toBe(true);
    expect(isIpAllowed("192.168.1.1\n10.0.0.1", "10.0.0.2")).toBe(false);
  });

  it("matches CIDR ranges", () => {
    expect(isIpAllowed("192.168.1.0/24", "192.168.1.42")).toBe(true);
    expect(isIpAllowed("192.168.1.0/24", "192.168.2.1")).toBe(false);
    expect(isIpAllowed("10.0.0.0/8", "10.255.255.255")).toBe(true);
    expect(isIpAllowed("10.0.0.0/8", "11.0.0.1")).toBe(false);
  });

  it("matches mixed IP and CIDR entries", () => {
    expect(isIpAllowed("192.168.1.1\n10.0.0.0/8", "10.5.5.5")).toBe(true);
    expect(isIpAllowed("192.168.1.1\n10.0.0.0/8", "172.16.0.1")).toBe(false);
  });

  it("matches IPv6 exact address", () => {
    expect(isIpAllowed("2001:db8::1", "2001:db8::1")).toBe(true);
    expect(isIpAllowed("2001:db8::1", "2001:db8::2")).toBe(false);
  });

  it("matches IPv6 CIDR /64", () => {
    expect(isIpAllowed("2001:db8::/32", "2001:db8:1234:5678::1")).toBe(true);
    expect(isIpAllowed("2001:db8::/32", "2001:db9::1")).toBe(false);
  });

  it("matches IPv6 abbreviated notation", () => {
    expect(isIpAllowed("::1", "::1")).toBe(true);
    expect(isIpAllowed("::1/128", "::1")).toBe(true);
    expect(isIpAllowed("::1/128", "::2")).toBe(false);
  });

  it("rejects invalid CIDR prefix bits", () => {
    expect(isIpAllowed("10.0.0.0/33", "10.0.0.1")).toBe(false);
    expect(isIpAllowed("2001:db8::/129", "2001:db8::1")).toBe(false);
  });

  it("treats v4 and v6 as separate address families", () => {
    expect(isIpAllowed("::ffff:192.168.1.1", "192.168.1.1")).toBe(false);
  });
});
