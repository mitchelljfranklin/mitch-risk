# API — Vendors

Manage vendor records, scores, exports, and sub-resources.

## Endpoints

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/vendors` | `vendors:view` | List vendors, with optional `?query=` and `?tier=` filters |
| `POST` | `/api/v1/vendors/import` | `vendors:create` | Create a vendor from a JSON body |
| `GET` | `/api/v1/vendors/{id}` | `vendors:view` | Get vendor detail |
| `PUT` | `/api/v1/vendors/{id}` | `vendors:edit` | Update vendor profile |
| `DELETE` | `/api/v1/vendors/{id}` | `vendors:delete` | Delete vendor (cascades to assessments and files) |
| `GET` | `/api/v1/vendors/{id}/score` | `vendors:view` | Get vendor score summary |
| `GET` | `/api/v1/vendors/{id}/export` | `vendors:view` | Export vendor as JSON |
| `GET` | `/api/v1/vendors/{id}/assessments` | `vendors:view` | List vendor's assessments |
| `GET` | `/api/v1/vendors/{id}/certifications` | `vendors:view` | List vendor's certifications |

## Examples

### List All Vendors

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/vendors
```

### Search Vendors

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  "http://localhost:3000/api/v1/vendors?query=aws&tier=HIGH"
```

### Get Vendor Detail

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/vendors/{vendor-id}
```

### Create Vendor

```bash
curl -X POST \
  -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","contactName":"Jane Smith","contactEmail":"jane@acme.com","tier":"MEDIUM"}' \
  http://localhost:3000/api/v1/vendors/import
```

### Update Vendor

```bash
curl -X PUT \
  -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  -H "Content-Type: application/json" \
  -d '{"tier":"HIGH","dataSensitivity":"CONFIDENTIAL"}' \
  http://localhost:3000/api/v1/vendors/{vendor-id}
```

### Delete Vendor

```bash
curl -X DELETE \
  -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/vendors/{vendor-id}
```

### Get Vendor Score

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/vendors/{vendor-id}/score
```

### Export Vendor as JSON

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/vendors/{vendor-id}/export
```

### List Vendor's Assessments

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/vendors/{vendor-id}/assessments
```

### List Vendor's Certifications

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/vendors/{vendor-id}/certifications
```

> Full request/response schemas are available in the [Swagger UI](http://localhost:3000/docs).
