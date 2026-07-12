# Dashboard

The dashboard is your portfolio-level view of vendor risk — metrics, charts, attention items, and navigation shortcuts in a single screen.

## Top Metrics

Four animated stat cards at the top of the dashboard give you an at-a-glance summary:

| Card | What It Shows |
|---|---|
| **Vendors** | Total vendor count. If a score exists for the vendor, it pulls from the latest completed assessment |
| **Assessments Active** | Count of assessments in `SENT` or `IN_PROGRESS` — questionnaires currently being completed by vendors |
| **Open Findings** | Total unresolved findings across all vendors. Filterable by severity (Critical, High, Medium, Low) |
| **Average Score** | Portfolio-wide average of all vendor overall scores |

## Charts

### Portfolio Risk Distribution (Donut)

A donut chart breaking down your vendor portfolio by RAG classification:

- **Green** — vendors with an overall score ≥ 85% (low risk)
- **Amber** — vendors with an overall score between 60% and 84% (medium risk, monitor)
- **Red** — vendors with an overall score below 60% (high risk, action needed)
- **Unscored** — vendors with no completed assessments yet

Clicking a segment highlights that risk band.

### Open Findings by Severity (Bar Chart)

A horizontal bar chart showing your open finding count broken down by severity: Critical, High, Medium, Low. Each bar is colour-coded using the RAG palette. Use this to quickly see where your most severe risk concentrations are.

### Risk by Tier (Stacked Bar Chart)

A stacked horizontal bar chart that layers the RAG distribution by vendor tier (Critical, High, Medium, Low). This shows you at a glance whether your CRITICAL-tier vendors are green (well-assessed and compliant) or red (they need urgent attention).

## Needs Attention

The **Needs Attention** section groups actionable items so you can focus on what matters. Summary pills at the top show real-time counts from the notification system, each linking to the relevant page:

| Pill | Counts | Links to |
|---|---|---|
| **Unreviewed** | Assessments waiting for review (status `SUBMITTED`) | Assessments filtered by status |
| **Clarifications** | Assessments sent back to vendors for clarification | Assessments list |
| **Failed emails (24h)** | Email delivery failures in the last 24 hours | Email Tracking in Settings |

Below the pills, three expandable groups provide vendor-level detail:

| Group | What It Contains | Why It Matters |
|---|---|---|
| **Overdue Assessments** | Assessments past their due date, grouped by vendor | These vendors haven't responded — risk is unknown |
| **Below Threshold** | Vendors with overall scores below the amber RAG threshold (< 60%) | These vendors have significant compliance gaps |
| **Key Dates** | Upcoming certification and contract expiries within 30 days | Proactive renewal tracking prevents lapses |

Each group is expandable — click to see the individual items. The section header shows a count for each group so you know what needs attention without expanding.

## Assessment Activity

An interactive area chart showing assessment completion activity over time, with a configurable time range selector (7 days, 30 days, 90 days, 1 year). Hover over data points for details on specific assessments.

## Keyboard Shortcuts

Press **`?`** (question mark) or **`Ctrl+K`** (Windows/Linux) / **`Cmd+K`** (Mac) anywhere in the app to open the command palette — a searchable list of every page you have permission to access.

| Key | Action |
|---|---|
| `?` or `Ctrl/Cmd+K` | Open / close the command palette |
| `↑` / `↓` | Navigate through results |
| `Enter` | Open the selected page |
| `Esc` | Close the palette |

Type to fuzzy-search by page name. The palette only shows pages your role has permission to access — a Viewer will not see settings or admin pages.

## Idle Timeout

If your session is inactive for longer than the configured session timeout (default: 30 minutes), a 60-second countdown appears. If you do not interact with the page before the countdown reaches zero, you are automatically signed out.

The timeout is configurable under Settings → Limits. Setting it to `0` disables the timer entirely.

The countdown resets on any mouse movement, keyboard input, scroll, or tap — you only need to interact with the page, not click anything specific.

## Exporting Dashboard Data

Click **Export Report** on the dashboard to generate a PDF portfolio report containing vendor scores, RAG distribution, open findings summary, and compliance coverage overview. Use this for board presentations or periodic review meetings.
