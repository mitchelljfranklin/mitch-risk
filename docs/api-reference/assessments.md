# API — Assessments

Query assessment lists and full assessment detail including questions, responses, findings, and comments.

## Endpoints

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/assessments` | `assessments:view` | List assessments with filters and optional CSV export |
| `GET` | `/api/v1/assessments/{id}` | `assessments:view` | Full assessment detail |

### Query Parameters — List

| Parameter | Type | Description |
|-----------|------|-------------|
| `vendorId` | string | Filter by vendor ID |
| `status` | string | Filter by status (`DRAFT`, `SENT`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `COMPLETED`) |
| `overdue` | boolean | Set to `true` to show only overdue assessments (past due date while SENT or IN_PROGRESS) |
| `fromDate` | ISO 8601 | Assessments created on or after this date |
| `toDate` | ISO 8601 | Assessments created on or before this date |
| `format` | string | Set to `csv` for CSV export instead of JSON |

## Examples

### List All Assessments

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/assessments
```

### Filter by Vendor and Status

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  "http://localhost:3000/api/v1/assessments?vendorId={vendor-id}&status=COMPLETED"
```

### Filter by Date Range

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  "http://localhost:3000/api/v1/assessments?fromDate=2026-01-01&toDate=2026-06-30"
```

### Export as CSV

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  "http://localhost:3000/api/v1/assessments?format=csv" \
  --output assessments.csv
```

### Get Assessment Detail

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/assessments/{assessment-id}
```

The detail response includes the full assessment object with questions, vendor responses, findings, comments, evidence, review decisions, and score breakdown.

> Full request/response schemas are available in the Swagger UI at `/docs` on your running instance.
