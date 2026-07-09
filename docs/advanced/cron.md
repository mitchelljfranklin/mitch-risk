# Cron & Automation

Mitch‑Risk includes a cron endpoint that handles scheduled maintenance. An external scheduler (system cron, Kubernetes CronJob, etc.) hits this endpoint periodically.

## Setup

```bash
# Every 15 minutes
*/15 * * * * curl -H "X-Cron-Secret: $CRON_SECRET" https://risk.example.com/api/cron/run
```

**CRON_SECRET** is required in production — the app refuses to start without it. The endpoint returns 401 if the secret doesn't match (constant-time comparison).

## Jobs (run in order)

| # | Job | Description |
|---|---|---|
| 1 | **Reminders** | Emails vendors when assessment is due in N days. Default offsets: 7 and 1 day before due. Configurable under Settings → Scheduling |
| 2 | **Escalations** | Emails reviewer when assessment is overdue beyond threshold. Default: 3 days past due. Configurable under Settings → Scheduling |
| 3 | **Expiry notices** | Emails risk owner when certification or contract is expiring. 30-day and 7-day windows |
| 4 | **Recurring assessments** | Clones assessments set to quarterly/annual, sends new invitation, schedules next run |
| 5 | **Audit log pruning** | Deletes audit entries older than retention period (configurable) |
| 6 | **Email log pruning** | Deletes notification logs older than retention period (default: 14 days) |
| 7 | **Orphaned file sweep** | Deletes stored files not referenced by any evidence or attachment record. Grace period: files newer than 1 hour are preserved (safe for in-flight uploads) |

## Idempotency

All notification jobs (reminders, escalations, expiry notices) check for existing sent logs before re-sending. A job can run multiple times without duplicate emails.

## Log retention

| Log type | Default retention | Config location |
|---|---|---|
| Email logs | 14 days | Settings → Scheduling |
| Audit logs | Configurable | Settings → Scheduling |

## Rate limit configuration

All abuse-protection limits are configurable under **Settings → Scheduling**:

| Limit | Default | Purpose |
|---|---|---|
| Login attempts | 10/min | Per-IP rate on credentials callback |
| Portal page loads | 30/min | Per-visitor, prevents token scraping |
| Portal uploads | 10/min | Per-visitor file upload limit |
| Portal submissions | 5/min | Per-link, prevents rapid resubmission |
| Portal password | 5/min | Per-link password attempt limit |
| Password reset | 1/min | Per email, prevents spam |
| Break-glass | 10/min | Per IP |
| API key default | 30/min | Per IP, then per key prefix |
| Session timeout | 30 min | Idle time before auto-logout (client-side countdown + server-enforced JWT `exp`) |

The rate limiter is **in-memory per process** — sufficient for single-container deployment. For horizontal scaling, a Redis-backed limiter would be needed (not currently implemented).
