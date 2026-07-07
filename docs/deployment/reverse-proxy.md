# Reverse Proxy

mitch-risk is designed to run behind a TLS-terminating reverse proxy (Caddy, nginx, Zoraxy, Azure Application Gateway, etc.). The app itself serves HTTP on port 3000 — the proxy handles HTTPS and forwards headers.

## TRUSTED_PROXY_COUNT

This environment variable controls how the client IP is resolved from `X-Forwarded-For`. It specifies how many hops from the **right** of the header are trusted proxies — the client IP is read from one hop further left.

| Setup | Value | Explanation |
|-------|:-----:|-------------|
| Direct access (no proxy) | `0` | `X-Forwarded-For` is ignored |
| Single reverse proxy | `1` | One proxy trustable — client IP is second from right |
| CDN in front of proxy (2 hops) | `2` | Both the CDN and your proxy are trusted |
| Azure Application Gateway | `1` | Single Azure hop |
| Azure Front Door + Gateway | `2` | Two Azure hops |

> **Incorrect `TRUSTED_PROXY_COUNT`** means the client IP can be spoofed by sending a forged `X-Forwarded-For` header. This affects rate limiting and API key IP allowlisting.

## Required Headers

Your proxy **must forward** these headers:

| Header | Purpose |
|--------|---------|
| `Host` / `X-Forwarded-Host` | Public hostname for auth callbacks and cookie domain |
| `X-Forwarded-Proto` | `https` — so auth issues Secure cookies |
| `X-Forwarded-For` | Client IP for rate limiting and API key allowlisting |

## Caddy

Caddy forwards all `X-Forwarded-*` headers automatically. Minimum config:

```caddy
risk.example.com {
    reverse_proxy app:3000
}
```

Set `TRUSTED_PROXY_COUNT=1`.

## nginx

```nginx
server {
    listen 443 ssl;
    server_name risk.example.com;

    ssl_certificate     /etc/ssl/certs/risk.example.com.pem;
    ssl_certificate_key /etc/ssl/private/risk.example.com.key;

    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Set `TRUSTED_PROXY_COUNT=1`.

## Custom CLIENT_IP_HEADER

If your proxy or CDN sets a dedicated single-IP header, use `CLIENT_IP_HEADER` instead of `X-Forwarded-For`:

| Proxy/CDN | Header |
|-----------|--------|
| Cloudflare | `CF-Connecting-IP` |
| Azure Front Door | `X-Azure-ClientIP` |
| AWS CloudFront | `CloudFront-Viewer-Address` (first value) |

```env
CLIENT_IP_HEADER=cf-connecting-ip
```

When `CLIENT_IP_HEADER` is set, it takes priority over `X-Forwarded-For` resolution. Set it to `false` to explicitly disable the dedicated header check.

## Security Notes

- **Never expose port 3000 publicly.** All traffic should go through the proxy.
- The app does **not** set HSTS — your proxy should handle that.
- The app uses `trustHost: true` in Auth.js, deriving origin and protocol from forwarded headers. Set `APP_URL` to your public HTTPS URL to ensure portal links and auth callbacks are correct.
- If auth callbacks or portal links are pointing at `localhost`, verify `APP_URL` is set correctly and your proxy forwards the required headers.
