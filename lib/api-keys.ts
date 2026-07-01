import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const KEY_PREFIX = "mrk_";
const KEY_LENGTH = 40;

export function generateApiKey(): { fullKey: string; prefix: string } {
  const random = randomBytes(KEY_LENGTH / 2).toString("hex");
  const fullKey = `${KEY_PREFIX}${random}`;
  const prefix = fullKey.slice(0, 12) + "...";
  return { fullKey, prefix };
}

export function hashApiKey(key: string): string {
  return bcrypt.hashSync(key, 12);
}

export function verifyApiKey(key: string, hash: string): boolean {
  return bcrypt.compareSync(key, hash);
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
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}
