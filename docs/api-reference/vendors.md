# API — Vendors

Manage vendor records, scores, exports, and sub-resources.

## Endpoints

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/vendors` | `vendors:view` | List vendors, with optional `?query=`, `?tier=`, `?tag=`, and `?externalId=` filters |
| `GET` | `/api/v1/vendors/external/{externalId}` | `vendors:view` | Look up a vendor by its external ID (404 if not found) |
| `POST` | `/api/v1/vendors/import` | `vendors:create` | Create a vendor from a JSON body |
| `GET` | `/api/v1/vendors/{id}` | `vendors:view` | Get vendor detail |
| `PUT` | `/api/v1/vendors/{id}` | `vendors:edit` | Update vendor profile |
| `DELETE` | `/api/v1/vendors/{id}` | `vendors:delete` | Delete vendor (cascades to assessments and files) |
| `GET` | `/api/v1/vendors/{id}/score` | `vendors:view` | Get vendor score summary |
| `GET` | `/api/v1/vendors/{id}/export` | `vendors:view` | Export vendor as CSV |
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

### Look up by external ID

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/vendors/external/ERP-V-001
```

The `externalId` filter is an exact match — it returns the single vendor (if any) carrying that reference. You can also query `?externalId=` on the list endpoint, which returns a one-element array instead of full detail.

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
  -d '{"name":"Acme Corp","externalId":"ERP-V-001","contactName":"Jane Smith","contactEmail":"jane@acme.com","tier":"MEDIUM"}' \
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

### Export Vendor as CSV

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

> Full request/response schemas are available in the Swagger UI at `/docs` on your running instance.
