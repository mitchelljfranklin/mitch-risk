import { describe, expect, it } from "vitest";

import {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  isIpAllowed,
} from "@/lib/api-keys";

describe("API key generation and verification", () => {
  it("generates keys with mrk_ prefix and 40 hex chars", () => {
    const { fullKey, prefix } = generateApiKey();
    expect(fullKey.startsWith("mrk_")).toBe(true);
    expect(fullKey.length).toBe(4 + 40);
    expect(prefix.endsWith("...")).toBe(true);
    expect(prefix.length).toBe(15);
  });

  it("produces unique keys on each call", () => {
    const firstKey = generateApiKey();
    const secondKey = generateApiKey();
    expect(firstKey.fullKey).not.toBe(secondKey.fullKey);
    expect(firstKey.prefix).not.toBe(secondKey.prefix);
  });

  it("hashing and verification round-trips correctly", () => {
    const { fullKey } = generateApiKey();
    const hashed = hashApiKey(fullKey);
    expect(hashed).not.toBe(fullKey);
    expect(verifyApiKey(fullKey, hashed)).toBe(true);
    expect(verifyApiKey("wrong-key", hashed)).toBe(false);
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
});
