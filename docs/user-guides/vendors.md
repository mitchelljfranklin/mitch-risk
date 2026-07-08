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

## Vendor List

The vendors list view shows all vendors in a table with columns for name, tier, and score. **Click any column header** to sort the table — click again to reverse the order. A sort dropdown is also available in the filter bar with options to sort by name, tier, or score. Use the **View toggle** to switch between table rows and card layout.

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

- **Upload validation** — MIME type deny-list rejects dangerous types (HTML, SVG, JS, executables)
- **Drag-and-drop** — files can be added by dragging and dropping onto the attachment area, or by clicking to browse
- **Extension allowlist** — configurable (default: pdf, png, jpg, jpeg, docx, xlsx)
- **Magic-byte validation** — file signatures checked to detect renamed files
- **Size limit** — configurable `maxUploadMb` (default: 20 MB)
- **Authenticated serving** — files served via `GET /api/attachments/[id]`, never directly from storage
- **Inline display** restricted to PDF, PNG, JPEG, GIF, WebP — all other types force download

## Vendor Import (CSV)

Bulk-import or bulk-update vendors via CSV using a step-by-step wizard.

1. Navigate to **Vendors → Import**.
2. **Upload** — Select a CSV file, or download the CSV template from the link provided on the page. The app parses the file and shows a preview of the first 10 rows.
3. **Review** — Confirm the import. The summary shows how many rows will be processed. Click **Import vendors** to execute.

**CSV columns:** `id` (optional — include to update an existing vendor), `name`, `contactemail` (both required), plus optional: `contactname`, `tier`, `website`, `notes`, `servicedescription`, `datasensitivity`, `contractrenewaldate`. Max file size: 1 MB.

Rows with an `id` matching an existing vendor record will **update** that vendor instead of creating a new one. Rows without an `id` (or with an `id` not found) will create new vendor records. Invalid rows are skipped and reported in the result summary.

## Vendor Export (CSV)

Download vendor data as a CSV file from the Vendors page using the **Export CSV** dropdown:

- **All vendors** — exports every vendor in the database (unfiltered, regardless of current search/tier filters).
- **Current page** — exports only the vendors matching the current search, tier filter, sort, and page.

The CSV includes columns: `id`, `name`, `contactname`, `contactemail`, `tier`, `website`, `notes`, `servicedescription`, `datasensitivity`, `contractrenewaldate`. The `id` column can be used to update vendors via import (see [Vendor Import](#vendor-import-csv)).

## Vendor Comparison

Compare two vendors side-by-side:

- **Same-vendor over time** — compare two assessments for the same vendor to see trend
- **Cross-vendor** — compare assessments from different vendors against each other
- **Score comparison** with RAG badges
- **Domain-level breakdown** showing compliance by framework domain
- **Findings count** comparison by severity

Use the **Compare** button on the vendor detail page or assessment list to initiate a comparison.
