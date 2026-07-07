# API — Frameworks

List compliance frameworks and view framework details with control mappings.

## Endpoints

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/frameworks` | `frameworks:view` | List all compliance frameworks |
| `GET` | `/api/v1/frameworks/{id}` | `frameworks:view` | Framework detail with controls |

### Query Parameters — Detail

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Filter controls by code or title |

## Examples

### List All Frameworks

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/frameworks
```

Response includes framework name, version, description, and control count.

### Get Framework Detail

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/frameworks/{framework-id}
```

Returns the framework with its full control list: domain, code, title, guidance for each control.

### Search Controls in a Framework

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  "http://localhost:3000/api/v1/frameworks/{framework-id}?search=access"
```

Returns the framework with only controls matching the search string in their code or title.

> Full request/response schemas are available in the [Swagger UI](http://localhost:3000/docs).
