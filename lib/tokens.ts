import { createHash, randomBytes } from "node:crypto";

const ACCESS_TOKEN_BYTES = 32;
const DEFAULT_TOKEN_TTL_DAYS = 30;

export function generateAccessToken(): string {
  return randomBytes(ACCESS_TOKEN_BYTES).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function expiryFromNow(
  days: number = DEFAULT_TOKEN_TTL_DAYS,
  now: Date = new Date(),
): Date {
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}
