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

  return directives.join("; ");
}

export function middleware(request: NextRequest) {
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
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );

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
