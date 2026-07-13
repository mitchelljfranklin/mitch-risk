# API — Findings

List and update findings across all assessments.

## Endpoints

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/findings` | `assessments:view` | List findings with filters |
| `PATCH` | `/api/v1/findings/{id}` | `assessments:review` | Update finding status |

### Query Parameters — List

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (`OPEN`, `REMEDIATED`, `RISK_ACCEPTED`) |
| `severity` | string | Filter by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) |
| `vendorId` | string | Filter by vendor ID |

### Request Body — Update Status

```json
{
  "status": "REMEDIATED"
}
```

A JSON body with `status` set to `REMEDIATED` or `RISK_ACCEPTED`. An optional `resolutionNote` can be included.

## Examples

### List All Findings

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/findings
```

### Filter Open Critical Findings

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  "http://localhost:3000/api/v1/findings?status=OPEN&severity=CRITICAL"
```

### Filter by Vendor

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  "http://localhost:3000/api/v1/findings?vendorId={vendor-id}"
```

### Update Finding Status

```bash
curl -X PATCH \
  -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  -H "Content-Type: application/json" \
  -d '{"status":"REMEDIATED"}' \
  http://localhost:3000/api/v1/findings/{finding-id}
```

```bash
curl -X PATCH \
  -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  -H "Content-Type: application/json" \
  -d '{"status":"RISK_ACCEPTED"}' \
  http://localhost:3000/api/v1/findings/{finding-id}
```

> Full request/response schemas are available in the Swagger UI at `/docs` on your running instance.
