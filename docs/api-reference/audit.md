# API — Audit

Query the audit log with pagination, filtering, and CSV export.

## Endpoints

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/v1/audit` | `audit:view` | Query audit log |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number for pagination |
| `action` | string | Filter by action type (e.g. `LOGIN`, `CREATE_VENDOR`) |
| `userId` | string | Filter by user ID |
| `fromDate` | ISO 8601 | Entries on or after this date |
| `toDate` | ISO 8601 | Entries on or before this date |
| `format` | string | Set to `csv` for CSV export instead of JSON |

### Supported Action Types

Common action filters include: `LOGIN`, `CREATE_VENDOR`, `UPDATE_VENDOR`, `DELETE_VENDOR`, `CREATE_ASSESSMENT`, `DELETE_ASSESSMENT`, `SEND_ASSESSMENT`, `REVIEW_DECISION`, `FINALIZE_ASSESSMENT`, `CREATE_TEMPLATE`, `UPDATE_TEMPLATE`, `DELETE_TEMPLATE`, `CREATE_USER`, `DISABLE_USER`, `ENABLE_USER`, `CHANGE_ROLE`, `RESET_PASSWORD`, `DELETE_USER`, `UPDATE_SETTINGS`, `CREATE_API_KEY`, `REVOKE_API_KEY`, `DELETE_API_KEY`, `CREATE_ROLE`, `UPDATE_ROLE`, `DELETE_ROLE`, `IMPORT_FRAMEWORK`, `ADD_COMMENT`, `UPDATE_FINDING`, and more.

Each audit entry includes the user, action, entity type, entity ID, timestamp, and optional metadata JSON.

## Examples

### List Recent Audit Entries

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  http://localhost:3000/api/v1/audit
```

### Filter by Action and Date

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  "http://localhost:3000/api/v1/audit?action=DELETE_VENDOR&fromDate=2026-06-01"
```

### Paginate

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  "http://localhost:3000/api/v1/audit?page=2"
```

### Export as CSV

```bash
curl -H "Authorization: Bearer mrk_<prefix>.<secret>" \
  "http://localhost:3000/api/v1/audit?format=csv" \
  --output audit-log.csv
```

> Full request/response schemas are available in the [Swagger UI](http://localhost:3000/docs).
