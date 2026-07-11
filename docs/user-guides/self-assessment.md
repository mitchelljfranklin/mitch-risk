# Self-Assessment

Mitch‑Risk includes a self-assessment mode that lets you evaluate your own organization using the same questionnaire tools your vendors use. It uses the vendor portal workflow internally so you see exactly what your vendors see.

## How It Works

Self-assessment uses a built-in internal vendor record called **"My Organization"**. This vendor is created automatically the first time you visit the self-assessment page — no manual setup required.

1. Go to **Self-Assessment** from the sidebar
2. Click **Start new assessment**
3. Choose a published template — e.g. an ISO 27001 self-assessment
4. Give it a title and optional due date
5. Click **Start assessment**

The platform creates an assessment for "My Organization" and redirects you to the vendor portal. You answer the questions just like any external vendor would — auto-save, conditional logic, Markdown help text, and all.

## Submitting and Reviewing

When you submit:

- The assessment status changes to `SUBMITTED`
- Your answers are locked (read-only in the portal)
- A reviewer on your team can open it for review, just like any vendor assessment
- Scoring, findings generation, and compliance mapping work identically

You can also request clarification, re-open, and resubmit — the same send-back-to-vendor workflow applies.

## Tracking Self-Assessments

The self-assessment landing page shows all your past self-assessments in a list with:

- Assessment title and template
- Status badge (Draft, Sent, In Progress, Submitted, Under Review, Completed)
- Score badge when a score is available

Click any assessment to jump to its detail page for full review.

## When to Use Self-Assessment

- **Internal gap analysis** — run a SOC 2 or ISO 27001 questionnaire against yourself before sending it to vendors, so you understand the questions and identify your own gaps
- **Pre-audit preparation** — complete assessments against the frameworks you expect auditors to evaluate
- **Team training** — new reviewers can complete a self-assessment to learn the questionnaire flow without involving an external party
- **Baseline tracking** — assess your own posture over time and compare against vendor scores

## Limitations

- Self-assessments use a single internal vendor ("My Organization") — you cannot create multiple internal vendor profiles or assess individual departments separately
- The internal vendor has no contact email for invites since you're completing it yourself — no email is sent
- Self-assessments appear in the same assessment list and risk register as vendor assessments — the "My Organization" vendor is visible in the vendors list
