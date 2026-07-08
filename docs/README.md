# mitch-risk

A lightweight, self-hosted third party vendor risk management solution. Build security questionnaires, send them to vendors via no-login secure links, auto-score responses, map answers to compliance frameworks, and track vendor risk profiles over time.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Template** | A reusable questionnaire blueprint containing sections and questions. Templates can be versioned and published. |
| **Assessment** | A questionnaire sent to a vendor. Questions are frozen from the template at creation. |
| **Vendor** | A third-party organisation being assessed. Tracks profile info, certifications, attachments, and overall risk score. |
| **Finding** | A non-compliant answer surfaced as a trackable issue. Can be auto-generated or created manually. |
| **Framework** | A compliance standard (ISO 27001, SOC 2, NIST CSF, Essential Eight) that questions map to. |

## How It Works

```
 ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
 │ Build    │────▶│  Send    │────▶│  Vendor  │────▶│  Review  │
 │ Template │     │ to Vendor│     │ Answers  │     │ & Score  │
 └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                          │
                    ┌─────────────────────────────────────┘
                    ▼
             ┌──────────┐     ┌──────────┐
             │ Generate │────▶│  Track   │
             │ Findings │     │  Risk    │
             └──────────┘     └──────────┘
```

1. **Build a template** with sections, questions, risk weights, and framework control mappings.
2. **Send an assessment** to a vendor — they receive an email with a secure, no-login portal link.
3. **Vendor answers** via the portal. Progress auto-saves; conditional logic shows relevant questions.
4. **Review & score** — reviewer approves or requests clarification. Auto-scoring computes RAG scores.
5. **Findings generated** from non-compliant answers, tracked in the risk register.
6. **Track risk over time** with dashboards, trend charts, and vendor comparisons.

## Features

- **Questionnaire builder** with 12 question types (Yes/No, Multiple Choice, Free Text, File Upload, Date, Numeric, Combo Box, Multi-Select, Rating, URL, Email, Checkbox)
- **Conditional logic** — show/hide questions based on previous answers
- **Secure vendor portal** — no login, opaque token, optional password gate, auto-save progress
- **Weighted RAG scoring** with configurable risk weights and thresholds
- **Compliance mapping** to ISO 27001:2022, SOC 2, NIST CSF 2.0, and Essential Eight
- **Findings & risk register** — auto-generated and manual findings with remediation tracking
- **Vendor profiling** — tier, data sensitivity, risk owner, certifications, attachments
- **Recurring assessments** — quarterly or annual automatic resends
- **Dashboard** with portfolio metrics, animated stat cards, donut/bar charts, calendar heatmap
- **REST API** with session + API key auth (Bearer tokens, IP allowlisting)
- **Swagger UI** at `/docs` with full OpenAPI 3.0 spec
- **PDF reports** and CSV exports
- **Role-based access control** with 3 system roles + custom roles
- **Audit trail** for all state-changing operations
- **Configurable email** templates with token substitution
- **Cloud storage** support (local disk, AWS S3, Azure Blob)
- **Dark/light mode** with custom brand theming
- **Keyboard shortcuts** (`?` modal, `g`+letter navigation)
- **Idle timeout** with configurable auto-logout

## Supported Frameworks

| Framework | Controls |
|-----------|----------|
| ISO 27001:2022 | 93 Annex A controls |
| SOC 2 | 51 Trust Services Criteria |
| NIST CSF 2.0 | 129 subcategories across 6 functions |
| Essential Eight | 55 controls across 8 strategies |

## Where to Go Next

| Section | What You'll Learn |
|---------|-------------------|
| [Quick Start](quick-start.md) | Get up and running in minutes with Docker Compose |
| [Templates](user-guides/templates.md) | Build and publish assessment templates |
| [Assessments](user-guides/assessments.md) | Send, score, and manage vendor assessments |
| [Review & Findings](user-guides/review.md) | Review responses and manage findings |
| [Vendors](user-guides/vendors.md) | Manage vendor profiles, certifications, and attachments |
| [RBAC & Roles](user-guides/rbac.md) | Configure permissions and access control |
| [SSO](configuration/sso.md) | Set up single sign-on with Entra ID, Google, or OIDC |
| [Email](configuration/email.md) | Configure SMTP, email templates, and logging |
| [Scoring](configuration/scoring.md) | Tune risk weights and RAG thresholds |
| [Cron & Automation](advanced/cron.md) | Schedule reminders, escalations, recurring assessments |
| [Security](advanced/security.md) | Auth methods, API keys, CSP, encryption |
| [API Reference](api-reference/overview.md) | Integrate with the REST API |
| [Docker](deployment/docker.md) | Deploy with Docker Compose |
| [FAQ](faq.md) | Common questions and answers |
