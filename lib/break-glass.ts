import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const BREAK_GLASS_BYTES = 24;

export function generateBreakGlassToken(): string {
  return randomBytes(BREAK_GLASS_BYTES).toString("hex");
}

export async function hashBreakGlassToken(token: string): Promise<string> {
  return bcrypt.hash(token, 12);
}

export async function verifyBreakGlassToken(
  token: string,
  hash: string,
): Promise<boolean> {
  if (!token || !hash) return false;
  return bcrypt.compare(token, hash);
}

export function shouldShowLocalAuth(params: {
  disableLocalAuth: boolean;
  ssoProviderCount: number;
  breakGlassValid: boolean;
}): boolean {
  if (!params.disableLocalAuth) return true;
  if (params.ssoProviderCount === 0) return true;
  return params.breakGlassValid;
}
