# API — Frameworks

List, view, and delete compliance frameworks with control mappings.

## Endpoints

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/frameworks` | `frameworks:view` | List all compliance frameworks |
| `GET` | `/api/v1/frameworks/{id}` | `frameworks:view` | Framework detail with controls |
| `DELETE` | `/api/v1/frameworks/{id}` | `frameworks:delete` | Permanently delete a framework and all its controls |

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

### Delete a Framework

```bash
curl -X DELETE -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/frameworks/{framework-id}
```

Deleting a framework permanently removes it and all its controls. Template questions mapped to these controls lose their assignments. Existing assessments and findings are not affected — the scoring engine handles missing control references gracefully. Returns `204 No Content` on success.

> Full request/response schemas are available in the Swagger UI at `/docs` on your running instance.
