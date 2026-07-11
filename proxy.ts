import { NextResponse, type NextRequest } from "next/server";

const SWAGGER_CDN = "https://cdn.jsdelivr.net";

function buildContentSecurityPolicy(
  nonce: string,
  isDevelopment: boolean,
): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    SWAGGER_CDN,
    isDevelopment ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline' ${SWAGGER_CDN}`,
    `img-src 'self' data: blob: ${SWAGGER_CDN}`,
    `font-src 'self' data: ${SWAGGER_CDN}`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];

  if (!isDevelopment) {
    directives.push(`report-uri /api/csp-report`);
  }

  return directives.join("; ");
}

function applySecurityHeaders(headers: Headers): void {
  // Strict-Transport-Security (HSTS) and upgrade-insecure-requests are
  // intentionally NOT set here. HSTS is delegated to the reverse proxy
  // (Caddy/nginx) which handles TLS termination. upgrade-insecure-requests
  // breaks same-origin Server Actions on HTTP-accessed self-hosted deployments.
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-content-type-options", "nosniff");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
}

function isDocumentRequest(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  // Server Actions and RSC navigations reuse the loaded document's scripts and
  // must not have their request headers rewritten (it drops the action result).
  if (request.headers.has("next-action")) return false;
  if (request.headers.get("rsc") === "1") return false;
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

export function proxy(request: NextRequest) {
  // Only full HTML document loads get the nonce-based CSP: the nonce is injected
  // into the server-rendered scripts, so it only applies to a fresh document.
  // Server Actions / RSC / data requests get the baseline headers only, leaving
  // their request headers untouched so action results are delivered intact.
  if (!isDocumentRequest(request)) {
    const passthrough = NextResponse.next();
    applySecurityHeaders(passthrough.headers);
    return passthrough;
  }

  const nonce = btoa(crypto.randomUUID());
  const isDevelopment = process.env.NODE_ENV !== "production";
  const contentSecurityPolicy = buildContentSecurityPolicy(
    nonce,
    isDevelopment,
  );

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("content-security-policy", contentSecurityPolicy);
  applySecurityHeaders(response.headers);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
