# OpenAPI / Swagger

The full OpenAPI 3.0 specification is maintained at
[`openapi.json`](https://github.com/mitchelljfranklin/mitch-risk/blob/master/docs/openapi.json)
in the repository, and is also available at `/api/docs` on any running Mitch‑Risk instance.

## Interactive documentation

Navigate to `/docs` on your deployed instance for an interactive Swagger UI where you can
explore every endpoint, see request/response schemas, and try API calls directly.

The Swagger UI is loaded from CDN and requires no extra dependencies.

## Endpoints

The REST API v1 covers:

| Resource | Operations |
|----------|-----------|
| Vendors | List, get, create, update, delete, import, export, score, assessments, certifications |
| Assessments | List, get (full detail with responses and findings) |
| Findings | List, update status |
| Frameworks | List, get (with controls), delete |
| Dashboard | Portfolio summary metrics |
| Audit | Paginated audit log (JSON or CSV) |

Authentication is via session cookie (web login) or Bearer token (API key).

See the [API Overview](overview.md) for getting started.
