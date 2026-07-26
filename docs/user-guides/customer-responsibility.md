# Customer Responsibility Tracking

When a vendor is SOC 2 or ISO 27001 certified, the certification's shared responsibility model means some controls are *their* job and some are *yours*. Mitch‑Risk tracks both sides so you know not just the vendor's compliance, but your own obligations too.

## How it works

1. **An admin marks controls as "shared responsibility"** in the Frameworks settings. SOC 2 ships with 13 controls pre-marked based on the published shared responsibility matrix. You can mark controls in any framework — ISO 27001, NIST CSF, Essential Eight, or a custom CSV import.

2. **When you record a vendor's certification**, check the "Compliance actions required" checkbox and select the relevant framework. Mitch‑Risk automatically creates a checklist of every shared-responsibility control from that framework, linked to the certification.

3. **The checklist appears on the vendor detail page**, grouped by certification, with a progress bar showing how many controls you've addressed.

4. **For each item** you can track status (Pending, In Progress, Completed, Not Applicable), assign it to a team member, add notes, and attach evidence files (screenshots, policy documents, audit records).

5. **Both paths create certifications:** the Certifications card on the vendor detail page, and the Attach Evidence button on assessment reviews.

## Where to find it

- **Vendor detail → Overview tab** — Customer Responsibility cards appear below the Certifications card when shared-responsibility controls exist
- **Vendor detail → Compliance tab** — Two stat cards show "Vendor compliance" and "Your compliance" side by side
- **Risk register** — Filter to "Customer responsibility" to see all PENDING and IN_PROGRESS actions across every vendor
- **Frameworks → Controls** — An admin with Frameworks: edit permission sees a "Shared" checkbox on every control row and the control detail page

## Statuses

| Status | Meaning |
|---|---|
| **Pending** | You haven't started on this control yet |
| **In Progress** | Work is underway |
| **Completed** | The control is implemented (timestamp recorded automatically) |
| **Not Applicable** | This control doesn't apply to your organisation |

## Marking controls as shared responsibility

Only users with the **Frameworks: edit** permission can mark controls:

1. Go to **Frameworks** → select a framework
2. In the controls list, check the "Shared" checkbox next to any control
3. The change saves immediately and is audit logged

You can also mark controls when importing a framework via CSV — include an optional `is_shared_responsibility` column with `true` or `false` values.

## Scoring

When shared-responsibility controls exist for a vendor, the compliance tab shows:

- **Vendor compliance** — the vendor's score from their assessment responses
- **Your compliance** — the percentage of shared-responsibility controls you've marked as Completed or Not Applicable

Both are shown as score cards with RAG colouring (red < 60%, amber < 85%, green ≥ 85%).

## Deleting a certification

When you delete a certification, your responsibility actions are preserved (the certification link is set to null, but status and evidence remain). This ensures you don't lose implementation records if a certification needs to be re-entered.
