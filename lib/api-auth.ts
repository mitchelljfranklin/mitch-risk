import { prisma } from "@/lib/prisma";
import { verifyApiKey, isIpAllowed } from "@/lib/api-keys";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { auth as nextAuth } from "@/lib/auth";
import {
  ALL_PERMISSIONS,
  type Permission,
  hasPermission,
} from "@/lib/permissions";

async function isApiEnabled(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({
    where: { key: "api.enabled" },
  });
  return row?.value === true;
}

export type AuthResult = {
  userId: string | null;
  roleId: string | null;
  permissions: string[];
  method: "session" | "apikey";
};

export function authResultHasPermission(
  auth: AuthResult,
  permission: Permission,
): boolean {
  return hasPermission(auth.permissions, permission);
}

export async function authenticateRequest(
  request: Request,
): Promise<AuthResult | null> {
  const session = await nextAuth();
  if (session?.user?.id) {
    return {
      userId: session.user.id,
      roleId: session.user.roleId,
      permissions: session.user.permissions,
      method: "session",
    };
  }

  const enabled = await isApiEnabled();
  if (!enabled) return null;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const key = header.slice(7).trim();
  if (!key.startsWith("mrk_") || key.length < 20) return null;

  const defaultRateRow = await prisma.appSetting.findUnique({
    where: { key: "api.defaultRateLimitPerMin" },
  });
  const defaultRate = (
    defaultRateRow && typeof defaultRateRow.value === "number"
      ? defaultRateRow.value
      : 30
  ) as number;

  if (!rateLimit("apikey", key.slice(0, 12), defaultRate)) return null;

  const hash = key;
  const apiKeys = await prisma.apiKey.findMany({
    where: { disabled: false },
  });

  for (const apiKey of apiKeys) {
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) continue;

    if (!verifyApiKey(hash, apiKey.keyHash)) continue;

    const ip = getClientIp(request.headers);
    if (!isIpAllowed(apiKey.allowedIps, ip)) continue;

    if (apiKey.rateLimitPerMin) {
      if (!rateLimit("apikey-perkey", apiKey.id, apiKey.rateLimitPerMin))
        return null;
    }

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    // API keys are full-access and independent of the creating account: they
    // grant every permission and keep working even if the creator is disabled
    // or deleted. Minting keys is gated by API_MANAGE (Admin-only by default).
    return {
      userId: apiKey.createdBy,
      roleId: null,
      permissions: [...ALL_PERMISSIONS],
      method: "apikey",
    };
  }

  return null;
}
