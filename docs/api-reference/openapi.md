# OpenAPI / Swagger

The full OpenAPI 3.0 specification is maintained in
[`lib/openapi.json`](https://github.com/mitchelljfranklin/mitch-risk/blob/master/lib/openapi.json)
(the canonical source) and mirrored to
[`docs/public/openapi.json`](https://github.com/mitchelljfranklin/mitch-risk/blob/master/docs/public/openapi.json)
for this documentation site. It is also available at `/api/docs` on any running Mitch‑Risk instance (requires authentication with `api:manage` permission).

## Interactive documentation

Navigate to `/docs` on your deployed instance for an interactive Swagger UI where you can
explore every endpoint, see request/response schemas, and try API calls directly.

> The Swagger UI requires a running Mitch‑Risk instance — it is not available in these
> static documentation pages. Start your instance and visit `/docs` to try the API live.

## OpenAPI Spec

You can view or download the raw OpenAPI 3.0 spec:

- [openapi.json](/openapi.json) (bundled with these docs)
- [lib/openapi.json](https://github.com/mitchelljfranklin/mitch-risk/blob/master/lib/openapi.json) (source in the repository)

## Endpoints

The REST API v1 covers:

| Resource | Operations |
|----------|-----------|
| Vendors | List, get (by id or external ID), create, update, delete, import, export, score, assessments, certifications |
| Assessments | List, get (full detail with responses and findings) |
| Findings | List, update status |
| Frameworks | List, get (with controls), delete |
| Dashboard | Portfolio summary metrics |
| Audit | Paginated audit log (JSON or CSV) |

Authentication is via session cookie (web login) or Bearer token (API key).

See the [API Overview](./overview) for getting started.
