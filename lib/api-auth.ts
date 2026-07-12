import { prisma } from "@/lib/prisma";
import { verifyApiKey, isIpAllowed, extractKeyPrefix } from "@/lib/api-keys";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { auth as nextAuth } from "@/lib/auth";
import { type Permission, hasPermission } from "@/lib/permissions";

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
  const keyPrefix = extractKeyPrefix(key);
  if (!keyPrefix || key.length < 20) return null;

  const defaultRateRow = await prisma.appSetting.findUnique({
    where: { key: "api.defaultRateLimitPerMin" },
  });
  const defaultRate = (
    defaultRateRow && typeof defaultRateRow.value === "number"
      ? defaultRateRow.value
      : 30
  ) as number;

  const ip = getClientIp(request.headers);

  if (!rateLimit("apikey-ip", ip, defaultRate)) return null;

  if (!rateLimit("apikey", keyPrefix, defaultRate)) return null;

  const candidates = await prisma.apiKey.findMany({
    where: { keyPrefix, disabled: false },
  });

  for (const apiKey of candidates) {
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) continue;

    if (!(await verifyApiKey(key, apiKey.keyHash))) continue;

    const ip = getClientIp(request.headers);
    if (!isIpAllowed(apiKey.allowedIps, ip)) continue;

    if (apiKey.rateLimitPerMin) {
      if (!rateLimit("apikey-perkey", apiKey.id, apiKey.rateLimitPerMin))
        return null;
    }

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
    });

    const permissions =
      apiKey.permissions && apiKey.permissions.length > 0
        ? apiKey.permissions
        : [];

    return {
      userId: apiKey.createdBy,
      roleId: null,
      permissions,
      method: "apikey",
    };
  }

  return null;
}
