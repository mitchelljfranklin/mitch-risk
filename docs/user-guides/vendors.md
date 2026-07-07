# Vendors

Vendors are the third-party organisations you assess. The vendor record stores profile information, assessment history, certifications, attachments, and the overall risk score.

## Vendor Profile

| Field | Description |
|-------|-------------|
| **Name** | Vendor organisation name (required) |
| **Contact Name** | Primary contact person at the vendor |
| **Contact Email** | Email for assessment invites and reminders |
| **Website** | Vendor's public website URL |
| **Tier** | Risk tier: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| **Data Sensitivity** | Classification of data shared: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED` |
| **Service Description** | Description of the service or product provided |
| **Risk Owner** | Internal staff member responsible for this vendor |
| **Contract Renewal** | Date when the vendor contract is up for renewal |
| **Notes** | Free-form notes about the vendor relationship |
| **Overall Score** | Calculated from the most recent completed assessment (0–100%) |

The overall score is automatically updated whenever an assessment for this vendor is completed. It represents the vendor's compliance posture based on their most recent assessment.

## Certifications

Track vendor-held certifications with expiry monitoring:

| Field | Description |
|-------|-------------|
| **Name** | Certification name (e.g. "ISO 27001", "SOC 2 Type II") |
| **Issuer** | Certifying body or auditor |
| **Issued Date** | Date the certification was issued |
| **Expiry Date** | Date the certification expires |

Certifications with approaching expiry dates trigger notifications via cron:
- **7 days** before expiry
- **30 days** before expiry

Notices are sent to the vendor's risk owner. Certifications can have file attachments (e.g. certificate PDFs, audit reports).

## Attachments

Vendors support file attachments for contracts, agreements, scope documents, and certification evidence:

| Attribute | Description |
|-----------|-------------|
| **File Name** | Original uploaded filename |
| **Display Name** | User-friendly label shown in the UI |
| **Notes** | Optional description of the attachment |
| **MIME Type** | Detected content type |
| **Size** | File size in bytes |

### Attachment Security

- **Upload validation** — MIME type blocklist rejects dangerous types (HTML, SVG, JS, executables)
- **Extension allowlist** — configurable (default: pdf, png, jpg, jpeg, docx, xlsx)
- **Size limit** — configurable `maxUploadMb` (default: 20 MB)
- **Authenticated serving** — files served via `GET /api/attachments/[id]`, never directly from storage
- **Inline display** restricted to PDF, PNG, JPEG, GIF, WebP — all other types force download

## Vendor Import (CSV)

Bulk-import vendors via CSV:

1. Download the CSV template from the Vendors page.
2. Fill in vendor details (name, contact, tier, etc.).
3. Upload the CSV — each row creates or updates a vendor record.

CSV parsing handles quoted fields, CRLF line endings, and validates all values against the vendor schema before import.

## Vendor Comparison

Compare two vendors side-by-side:

- **Same-vendor over time** — compare two assessments for the same vendor to see trend
- **Cross-vendor** — compare assessments from different vendors against each other
- **Score comparison** with RAG badges
- **Domain-level breakdown** showing compliance by framework domain
- **Findings count** comparison by severity

Use the **Compare** button on the vendor detail page or assessment list to initiate a comparison.
