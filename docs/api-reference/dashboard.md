# API — Dashboard

Retrieve aggregated portfolio metrics for the dashboard.

## Endpoints

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/dashboard/summary` | `assessments:view` | Portfolio metrics aggregation |

## Response

The summary endpoint returns aggregated data across all vendors and assessments:

- **Score distribution** — RAG breakdown (green/amber/red counts and percentages)
- **Finding counts** — open, remediated, risk-accepted counts
- **Top deficient controls** — most frequently non-compliant controls across all assessments
- **Vendor metrics** — total vendors, assessed vendors, assessment count
- **Average score** — portfolio-wide average compliance score

## Example

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/dashboard/summary
```

> Full request/response schemas are available in the Swagger UI at `/docs` on your running instance.
