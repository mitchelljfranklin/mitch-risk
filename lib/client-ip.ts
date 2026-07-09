import { env } from "@/lib/env";

const UNKNOWN_IP = "unknown";

type HeaderGetter = { get(name: string): string | null };

type ClientIpOptions = {
  trustedProxyCount: number;
  clientIpHeader?: string;
};

function normalizeIp(rawValue: string): string {
  const value = rawValue.trim();
  if (value.length === 0) {
    return "";
  }

  if (value.startsWith("[")) {
    const closingBracket = value.indexOf("]");
    if (closingBracket > 0) {
      return value.slice(1, closingBracket);
    }
    return value.slice(1);
  }

  const firstColon = value.indexOf(":");
  const isIpv4WithPort =
    firstColon !== -1 && value.indexOf(":", firstColon + 1) === -1;
  if (isIpv4WithPort) {
    return value.slice(0, firstColon);
  }

  return value;
}

export function resolveClientIp(
  headers: HeaderGetter,
  options: ClientIpOptions,
): string {
  if (options.clientIpHeader) {
    const direct = headers.get(options.clientIpHeader);
    const normalized = direct ? normalizeIp(direct) : "";
    if (normalized) {
      return normalized;
    }
  }

  if (options.trustedProxyCount >= 1) {
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
      const hops = forwardedFor
        .split(",")
        .map((hop) => normalizeIp(hop))
        .filter((hop) => hop.length > 0);
      if (hops.length > 0) {
        const index = Math.max(0, hops.length - options.trustedProxyCount);
        return hops[index];
      }
    }
  }

  const realIp = headers.get("x-real-ip");
  const normalizedRealIp = realIp ? normalizeIp(realIp) : "";
  return normalizedRealIp || UNKNOWN_IP;
}

export function getClientIp(headers: HeaderGetter): string {
  return resolveClientIp(headers, {
    trustedProxyCount: env.TRUSTED_PROXY_COUNT,
    clientIpHeader: env.CLIENT_IP_HEADER,
  });
}
