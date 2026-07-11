# Webhooks

Webhooks let your external systems receive real-time event notifications from Mitch‑Risk. When an assessment is submitted, a finding is created, or a certification is about to expire, a signed JSON payload is POSTed to your configured HTTPS endpoint.

Configuration is under **Settings → Webhooks** (requires **Webhooks: manage** permission — Admin by default).

## Platform Presets

When creating a webhook endpoint, choose a platform preset to have the payload automatically formatted for your notification tool. No middleware required.

| Platform | Format | Auth |
|---|---|---|
| **Generic (HTTP)** | Raw JSON with `event`, `timestamp`, and `data` fields. HMAC-SHA256 signature in `X-MitchRisk-Signature` header | HMAC secret |
| **Slack** | Slack Block Kit message with header, fields section, and timestamp context. Uses `blocks` array with `mrkdwn` formatting | URL-based (Slack incoming webhook) |
| **Microsoft Teams** | Adaptive Card with `FactSet` layout. Uses `application/vnd.microsoft.card.adaptive` content type | URL-based (Teams incoming webhook connector) |
| **Discord** | Discord embed with title, colour bar, inline fields, timestamp, and footer. Uses `embeds` array | URL-based (Discord webhook URL) |

For Slack, Teams, and Discord, paste your platform's incoming webhook URL directly into the **URL** field. The signing process is handled by the platform's URL-level authentication — no HMAC headers are sent for these presets.

## Event Types

All five event types are wired end-to-end and fire automatically when their trigger conditions are met.

| Event | When It Fires |
|---|---|
| `ASSESSMENT_SUBMITTED` | A vendor submits their questionnaire |
| `ASSESSMENT_OVERDUE` | Cron detects an assessment past its due date and an escalation email is sent |
| `FINDING_CREATED` | Auto-scoring generates a new finding from a non-compliant answer |
| `FINDING_RESOLVED` | A finding's status changes to `REMEDIATED` or `RISK_ACCEPTED` |
| `CERTIFICATION_EXPIRING` | Cron detects a certification approaching expiry (30 or 7 day windows) |

Each endpoint subscribes to the events you select — you can configure different endpoints for different event types.

## Creating an Endpoint

1. Go to **Settings → Webhooks**
2. Click **Add endpoint**
3. Enter the **HTTPS URL** that will receive the webhook
4. Select the **events** to subscribe to (all checked by default)
5. Click **Create**

A signing secret is generated automatically for each endpoint. The secret is displayed once when the endpoint is created and is used to verify that incoming payloads originated from Mitch‑Risk.

## Payload Format

Every webhook delivery is an `HTTP POST` with a JSON body:

```json
{
  "event": "ASSESSMENT_SUBMITTED",
  "timestamp": "2026-07-11T10:30:00.000Z",
  "data": {
    "assessmentId": "cmrfr...",
    "vendorId": "cmrfr...",
    "vendorName": "Acme Corp",
    "score": 0.85
  }
}
```

The `data` object varies by event type. Assessment events include the assessment ID, vendor information, and score when available. Finding events include the finding ID, severity, status, and assessment reference. Certification events include the certification name, vendor, and expiry date.

## Verifying Payloads

Every delivery includes an HMAC-SHA256 signature in the `X-MitchRisk-Signature` header:

```
X-MitchRisk-Signature: sha256=<hex-encoded-hmac>
```

**Verify deliveries on your end** to ensure they originated from Mitch‑Risk:

```javascript
// Node.js
const crypto = require("crypto");

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace("sha256=", "")),
    Buffer.from(expected)
  );
}
```

```python
# Python
import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    received = signature.replace("sha256=", "")
    return hmac.compare_digest(expected, received)
```

Always use constant-time comparison (`timingSafeEqual` / `compare_digest`) to prevent timing attacks.

## Delivery Behaviour

- **10-second timeout** — if your endpoint does not respond within 10 seconds, the delivery is considered failed
- **No retries** — failed deliveries are not automatically retried. The platform logs a warning server-side
- **No ordering guarantee** — events fire in the order they occur, but network delivery is best-effort
- **Disabled endpoints** — endpoints that are disabled will not receive any deliveries

## Managing Endpoints

| Action | Description |
|---|---|
| **Enable / Disable** | Toggle an endpoint on or off without deleting it. Disabled endpoints retain their configuration and secret |
| **Delete** | Permanently remove an endpoint. The secret is destroyed — you cannot recover a deleted endpoint's configuration |
| **Event subscription** | Currently, events are selected at creation time. To change subscribed events, delete and re-create the endpoint |

## Example: Slack Notification on Assessment Submission

A common integration pattern is forwarding assessment submissions to a Slack channel. Set up a webhook endpoint pointing to your integration middleware (e.g., a small Cloudflare Worker or Lambda) that:

1. Receives the `ASSESSMENT_SUBMITTED` event
2. Verifies the `X-MitchRisk-Signature` header
3. Formats a Slack message and posts it to your Slack incoming webhook

## Security

- **Secrets are stored encrypted** — webhook signing secrets are stored with AES-256-GCM encryption, same as SMTP passwords and SSO credentials
- **Secrets shown once** — after creation, only the endpoint URL and event list are visible. If you lose a secret, delete and re-create the endpoint
- **Payload verification is your responsibility** — the signature header is provided for verification; it is up to your receiving endpoint to validate it
- **Use HTTPS** — webhook URLs should always use HTTPS to prevent payload interception
