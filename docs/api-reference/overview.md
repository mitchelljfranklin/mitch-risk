# API Reference

The Mitch‑Risk REST API provides programmatic access to vendors, assessments, findings, frameworks, dashboard metrics, and audit logs.

## Base URL

All API endpoints are under `/api/v1/`:

```
http://localhost:3000/api/v1/
```

In production, use your deployment URL:

```
https://risk.example.com/api/v1/
```

## Authentication

Two authentication methods are supported:

### 1. Session Cookie (Browser)

When logged into the web dashboard, your Auth.js session cookie is automatically sent with requests. No additional headers needed. Useful for testing from the browser console.

### 2. API Key (Bearer Token)

Generate an API key in **Settings → API**. Include it as a Bearer token:

```
Authorization: Bearer mrk_<prefix>.<secret>
```

**Key format:** `mrk_<8-hex-prefix>.<48-hex-secret>`

API keys can be granted **full platform access** (all permissions) or **scoped** to a specific subset of permissions (e.g., read-only audit access). Scoped keys are restricted to only the permissions assigned at creation time. Keys are independent of the creating user's role and permissions.

> **Important:** The full key is shown **only once** at creation. Copy it immediately — only the key prefix is displayed afterward.

## Error Format

All errors use a consistent JSON envelope:

```json
{
  "error": {
    "message": "Human-readable error description",
    "status": 400
  }
}
```

| Status Code | Meaning |
|:-----------:|---------|
| `200` | Success |
| `400` | Invalid request (bad parameters, validation failure) |
| `401` | Missing or invalid authentication |
| `403` | Authenticated but not authorized for this endpoint |
| `404` | Resource not found |
| `500` | Internal server error (generic message, no details leaked) |

Unexpected errors always return a generic 500 — no stack traces or internal state are exposed.

## Endpoint Summary

| Group | Methods | Description |
|-------|---------|-------------|
| [Vendors](./vendors) | GET, POST, PUT, DELETE | Vendor CRUD, score, export, sub-resources |
| [Assessments](./assessments) | GET | Assessment list and detail |
| [Findings](./findings) | GET, PATCH | Findings list and status updates |
| [Frameworks](./frameworks) | GET, DELETE | Framework list, detail with controls, and delete |
| [Dashboard](./dashboard) | GET | Portfolio metrics aggregation |
| [Audit](./audit) | GET | Audit log query with pagination and filters |

## Full Documentation

Interactive Swagger UI with request/response schemas is available at:

```
https://risk.example.com/docs
```

The OpenAPI 3.0 specification is maintained in `lib/openapi.json` and powers the Swagger UI.
