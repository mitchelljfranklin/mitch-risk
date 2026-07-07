import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const KEY_NAMESPACE = "mrk_";
const LOOKUP_BYTES = 4;
const SECRET_BYTES = 24;
const BCRYPT_ROUNDS = 12;

export type GeneratedApiKey = {
  fullKey: string;
  keyPrefix: string;
  displayPrefix: string;
};

export function generateApiKey(): GeneratedApiKey {
  const lookup = randomBytes(LOOKUP_BYTES).toString("hex");
  const secret = randomBytes(SECRET_BYTES).toString("hex");
  const keyPrefix = `${KEY_NAMESPACE}${lookup}`;
  const fullKey = `${keyPrefix}.${secret}`;
  const displayPrefix = `${keyPrefix}…`;
  return { fullKey, keyPrefix, displayPrefix };
}

export function extractKeyPrefix(key: string): string | null {
  if (!key.startsWith(KEY_NAMESPACE)) return null;
  const separatorIndex = key.indexOf(".");
  if (separatorIndex <= KEY_NAMESPACE.length) return null;
  return key.slice(0, separatorIndex);
}

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, BCRYPT_ROUNDS);
}

export async function verifyApiKey(
  key: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

function parseIps(allowedIps: string): string[] {
  return allowedIps
    .split("\n")
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);
}

export function isIpAllowed(allowedIps: string, clientIp: string): boolean {
  const allowed = parseIps(allowedIps);
  if (allowed.length === 0) return true;
  return allowed.some((entry) => {
    if (entry === clientIp) return true;
    if (entry.includes("/")) {
      return ipInCidr(clientIp, entry);
    }
    return false;
  });
}

function ipInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bitsStr] = cidr.split("/");
    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits)) return false;

    const isV6 = range.includes(":");

    if (isV6) {
      if (bits < 0 || bits > 128) return false;
      const ipNum = ip6ToBigInt(ip);
      const rangeNum = ip6ToBigInt(range);
      const maxBits = BigInt(128);
      const mask =
        (BigInt(-1) << (maxBits - BigInt(bits))) &
        ((BigInt(1) << maxBits) - BigInt(1));
      return (ipNum & mask) === (rangeNum & mask);
    }

    if (bits < 0 || bits > 32) return false;
    const ipNum = ip4ToBigInt(ip);
    const rangeNum = ip4ToBigInt(range);
    const mask =
      ~((BigInt(1) << BigInt(32 - bits)) - BigInt(1)) & BigInt(0xffffffff);
    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

function ip4ToBigInt(ip: string): bigint {
  let result = BigInt(0);
  const parts = ip.split(".");
  for (const octet of parts) {
    result = (result << BigInt(8)) + BigInt(parseInt(octet, 10));
  }
  return result & BigInt(0xffffffff);
}

function ip6ToBigInt(ip: string): bigint {
  const normalized = expandIpv6(ip);
  let result = BigInt(0);
  const groups = normalized.split(":");
  for (const group of groups) {
    result = (result << BigInt(16)) + BigInt(parseInt(group || "0", 16));
  }
  return result;
}

function expandIpv6(ip: string): string {
  if (ip.includes("::")) {
    const parts = ip.split("::");
    const left = parts[0] ? parts[0].split(":").length : 0;
    const right = parts[1] ? parts[1].split(":").length : 0;
    const missing = 8 - left - right;
    const fill = Array(missing).fill("0").join(":");
    const leftPart = parts[0] || "";
    const rightPart = parts[1] || "";
    const expanded =
      leftPart +
      (leftPart ? ":" : "") +
      fill +
      (rightPart ? ":" : "") +
      rightPart;
    return expanded.replace(/^:+|:+$/g, "");
  }
  return ip;
}
