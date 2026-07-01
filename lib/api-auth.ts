import { prisma } from "@/lib/prisma";
import { verifyApiKey, isIpAllowed } from "@/lib/api-keys";
import { rateLimit } from "@/lib/rate-limit";
import { auth as nextAuth } from "@/lib/auth";

async function isApiEnabled(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({
    where: { key: "api.enabled" },
  });
  return row?.value === true;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export type AuthResult = {
  userId: string;
  role: string;
  method: "session" | "apikey";
};

export async function authenticateRequest(
  request: Request,
): Promise<AuthResult | null> {
  const session = await nextAuth();
  if (session?.user?.id) {
    return {
      userId: session.user.id,
      role: session.user.role,
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
    include: { creator: { select: { id: true, role: true, disabled: true } } },
  });

  for (const apiKey of apiKeys) {
    if (apiKey.creator.disabled) continue;

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) continue;

    if (!verifyApiKey(hash, apiKey.keyHash)) continue;

    const ip = clientIp(request);
    if (!isIpAllowed(apiKey.allowedIps, ip)) continue;

    if (apiKey.rateLimitPerMin) {
      if (!rateLimit("apikey-perkey", apiKey.id, apiKey.rateLimitPerMin))
        return null;
    }

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      userId: apiKey.creator.id,
      role: apiKey.creator.role,
      method: "apikey",
    };
  }

  return null;
}
