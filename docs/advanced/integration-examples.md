# Integration Examples

Practical examples for integrating Mitch‑Risk with external systems via the REST API. All examples use curl and assume an API key generated under **Settings → API**.

## Authentication

All API requests authenticate via a Bearer token. Generate a key under **Settings → API**:

```
mrk_a1b2c3d4.e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

```bash
# Set once
export MRK_TOKEN="mrk_a1b2c3d4.e5f6g7h8i9..."
export MRK_BASE="https://risk.example.com/api/v1"

# Test
curl -sH "Authorization: Bearer $MRK_TOKEN" "$MRK_BASE/vendors" | head -c 200
```

## SIEM Integration

Poll the audit log for security events. Use cron to run every 5 minutes for near-real-time ingestion.

```bash
#!/bin/bash
# siem-poll.sh — run every 5 minutes via cron

SINCE=$(date -d "5 minutes ago" +%Y-%m-%d)
curl -sH "Authorization: Bearer $MRK_TOKEN" \
  "$MRK_BASE/audit?fromDate=$SINCE&page=1" \
  > /var/log/siem/mitch-risk-audit.json
```

Common SIEM alert rules from audit data:

| Alert | Audit action filter | Signal |
|---|---|---|
| Multiple failed logins | `?action=LOGIN&fromDate=<today>` | >5 LOGIN events from same IP in 5 minutes |
| User deleted | `?action=DELETE_USER` | Any match — investigate immediately |
| API key created | `?action=API_KEY_CREATED` | >1 per week — investigate |
| Settings changed | `?action=SETTING_UPDATED` | Any match — audit the change |

For Splunk, ingest CSV directly:

```bash
curl -sH "Authorization: Bearer $MRK_TOKEN" \
  "$MRK_BASE/audit?fromDate=$SINCE&format=csv" \
  > /opt/splunk/var/spool/splunk/mitch-risk.csv
```

## Ticketing Integration

Bidirectional flow: poll open findings → create tickets → update finding status when the ticket resolves.

**Step 1: Poll open findings**

```bash
curl -sH "Authorization: Bearer $MRK_TOKEN" \
  "$MRK_BASE/findings?status=OPEN&severity=CRITICAL" \
  | jq '.entries[] | {id, title, vendorName, severity}'
```

Example response:

```json
{
  "id": "f123",
  "title": "No encryption at rest",
  "vendorName": "Acme Corp",
  "severity": "CRITICAL"
}
```

**Step 2: Create Jira ticket** (example using Jira REST API)

```bash
curl -u jira@company.com:$JIRA_TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "project": { "key": "VRM" },
      "summary": "[VRM] Acme Corp — No encryption at rest",
      "description": "Finding f123: Vendor does not encrypt data at rest. Severity: CRITICAL",
      "issuetype": { "name": "Task" }
    }
  }' \
  https://company.atlassian.net/rest/api/3/issue
```

**Step 3: Close finding when ticket resolves**

```bash
curl -X PATCH \
  -H "Authorization: Bearer $MRK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "REMEDIATED", "resolutionNote": "Jira VRM-42: vendor implemented encryption at rest"}' \
  "$MRK_BASE/findings/f123"
```

## BI Dashboard

Pull aggregated metrics for Power BI, Metabase, or any BI tool.

```bash
# Daily snapshot
curl -sH "Authorization: Bearer $MRK_TOKEN" \
  "$MRK_BASE/dashboard" > dashboard-$(date +%Y-%m-%d).json
```

Example response fields:

```json
{
  "vendorCount": 42,
  "averageScore": 0.73,
  "openFindings": 12,
  "scoreDistribution": { "green": 25, "amber": 10, "red": 4, "unscored": 3 },
  "topDeficientControls": [
    { "code": "A.5.29", "title": "Info security during disruption", "vendorCount": 8 }
  ],
  "vendorsByTier": { "CRITICAL": 5, "HIGH": 12, "MEDIUM": 18, "LOW": 7 },
  "assessmentStatusCounts": { "DRAFT": 3, "SENT": 8, "IN_PROGRESS": 5, "SUBMITTED": 2, "UNDER_REVIEW": 1, "COMPLETED": 30, "OVERDUE": 3 }
}
```

## Vendor Onboarding

Bulk-load vendors from a procurement system or CSV export.

```bash
while IFS=, read -r name email tier; do
  curl -sX POST \
    -H "Authorization: Bearer $MRK_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"contactEmail\":\"$email\",\"tier\":\"$tier\"}" \
    "$MRK_BASE/vendors/import"
done < vendors.csv
```

## Custom Reporting

Generate a report for all completed assessments across all vendors.

```bash
#!/bin/bash
# assessment-report.sh

# List all completed assessments
curl -sH "Authorization: Bearer $MRK_TOKEN" \
  "$MRK_BASE/assessments?status=COMPLETED" \
  | jq -r '.entries[] | "\(.id) \(.vendorName) \(.title) \(.score)"' \
  | while read id vendor title score; do
    echo "Assessment: $title ($vendor) — Score: $score"
  done
```

Export to CSV for spreadsheet analysis:

```bash
curl -sH "Authorization: Bearer $MRK_TOKEN" \
  "$MRK_BASE/assessments?format=csv" \
  > all-assessments.csv
```

## Vendor Score Monitoring

Pull lightweight score summaries for all vendors — useful for monitoring dashboards.

```bash
# Get all vendor IDs
VENDOR_IDS=$(curl -sH "Authorization: Bearer $MRK_TOKEN" \
  "$MRK_BASE/vendors" | jq -r '.[].id')

for vendor in $VENDOR_IDS; do
  curl -sH "Authorization: Bearer $MRK_TOKEN" \
    "$MRK_BASE/vendors/$vendor/score"
done | jq '[.name, .overallScore, .lastAssessedAt]'
```

## Scheduling

Recommended crontab for a production deployment:

```bash
# Every 5 minutes — trigger cron jobs (reminders, escalations, pruning)
*/5 * * * * curl -sH "X-Cron-Secret: $CRON_SECRET" https://risk.example.com/api/cron/run

# Every 5 minutes — SIEM audit log polling
*/5  * * * * /usr/local/bin/siem-poll.sh

# Daily at 07:00 — BI dashboard snapshot
0    7 * * * /usr/local/bin/dashboard-snapshot.sh

# Weekly Monday — vendor score report
0    8 * * 1 /usr/local/bin/assessment-report.sh
```

## API Key Management

| Operation | Settings Path |
|---|---|
| Generate key | Settings → API → New Key |
| Set IP allowlist | Settings → API → edit key → Allowed IPs (one CIDR per line) |
| Set expiry | Settings → API → edit key → Expiry date |
| Revoke key | Settings → API → disable or delete key |
| Global enable/disable | Settings → API → toggle "Enable API" |
| Default rate limit | Settings → Limits → API default rate (30/min) |
