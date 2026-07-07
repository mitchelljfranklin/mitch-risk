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

export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
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

    const ipNum = ipToNumber(ip);
    const rangeNum = ipToNumber(range);
    const mask = ~(2 ** (32 - bits) - 1);

    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

function ipToNumber(ip: string): number {
  let ipAddressNumber = 0;
  const parts = ip.split(".");
  for (const octet of parts) {
    ipAddressNumber = (ipAddressNumber << 8) + parseInt(octet, 10);
  }
  const numericIp = ipAddressNumber >>> 0;
  return numericIp;
}
