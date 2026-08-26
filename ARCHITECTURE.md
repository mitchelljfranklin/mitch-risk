# Mitch‑Risk — Architecture Solution Design Document

> **Version:** 1.3.0  
> **Last Updated:** August 2026  
> **Audience:** Engineering, Security, Operations  
> **Status:** Approved

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Data Model](#4-data-model)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Assessment Lifecycle & Scoring](#6-assessment-lifecycle--scoring)
7. [Customer Responsibility Tracking](#7-customer-responsibility-tracking)
8. [Vendor Portal Flow](#8-vendor-portal-flow)
9. [File Storage Architecture](#9-file-storage-architecture)
10. [Email System](#10-email-system)
11. [Settings & Configuration](#11-settings--configuration)
12. [API Layer](#12-api-layer)
13. [Security Architecture](#13-security-architecture)
14. [Cron Jobs & Background Processing](#14-cron-jobs--background-processing)
15. [UI Component Architecture](#15-ui-component-architecture)
16. [Deployment Architecture](#16-deployment-architecture)
17. [Data Lifecycle](#17-data-lifecycle)
18. [Compliance Mapping](#18-compliance-mapping)
19. [Key Design Decisions](#19-key-design-decisions)

---

## 1. Executive Summary

**Mitch‑Risk** is a lightweight, self-hosted third party vendor risk management solution. It enables small-to-medium businesses to:

- Build and version questionnaire templates with conditional logic
- Send assessments to vendors via no-login secure portal links
- Auto-score vendor responses against configurable risk weights
- Map answers to ISO 27001, SOC 2, NIST CSF, and Essential Eight controls
- Surface non-compliant responses as findings with remediation tracking
- Track each vendor's risk profile over time with dashboards and reports
- Manage evidence attachments and certifications with expiry tracking
- Integrate with external systems via a REST API (Swagger/OpenAPI documented)
- Operate entirely behind a reverse proxy with no external dependencies

The platform is designed around three principles:

- **Simple and easy to manage** — no sprawling configuration; everything configurable in-app
- **Self-contained** — single Docker Compose stack: Next.js + PostgreSQL
- **Security-first** — CSP nonce, bcrypt, AES-256-GCM secrets, RBAC on every action

---

## 2. System Architecture Overview

### 2.1 High-Level Diagram

```
                                      INTERNET
                                          │
                                   ┌──────▼──────┐
                                   │   Reverse    │
                                   │   Proxy      │  Caddy / nginx
                                   │   (TLS)      │
                                   └──────┬──────┘
                                          │ HTTP (port 3000)
                                   ┌──────▼──────────────────────────┐
                                   │        Next.js 16 Server         │
                                   │                                  │
                                   │  ┌────────────────────────────┐  │
                                   │  │  proxy.ts                   │  │
                                   │  │  • CSP nonce injection      │  │
                                   │  │  • Security headers         │  │
                                   │  │  • Document-request gate    │  │
                                   │  └───────────┬────────────────┘  │
                                   │              │                   │
                                   │  ┌───────────▼────────────────┐  │
                                   │  │  App Router                 │  │
                                   │  │  ┌───────────────────────┐  │  │
                                   │  │  │ app/(internal)/        │  │  │
                                   │  │  │ Authenticated Dashboard│  │  │
                                   │  │  │ • Vendors CRUD         │  │  │
                                   │  │  │ • Assessments          │  │  │
                                   │  │  │ • Templates Builder    │  │  │
                                   │  │  │ • Frameworks           │  │  │
                                   │  │  │ • Risk Register        │  │  │
                                   │  │  │ • Settings             │  │  │
                                   │  │  │ • Audit Log            │  │  │
                                   │  │  │ • Reports & Exports    │  │  │
                                   │  │  └───────────────────────┘  │  │
                                   │  │  ┌───────────────────────┐  │  │
                                   │  │  │ app/(auth)/            │  │  │
                                   │  │  │ Login, First-run Setup │  │  │
                                   │  │  └───────────────────────┘  │  │
                                   │  │  ┌───────────────────────┐  │  │
                                   │  │  │ app/portal/[token]/    │  │  │
                                   │  │  │ Vendor Questionnaire    │  │  │
                                   │  │  │ (no-login, opaque token)│  │  │
                                   │  │  └───────────────────────┘  │  │
                                   │  │  ┌───────────────────────┐  │  │
                                   │  │  │ app/api/               │  │  │
                                   │  │  │ • REST v1 endpoints    │  │  │
                                   │  │  │ • File serving         │  │  │
                                   │  │  │ • Cron trigger         │  │  │
                                   │  │  │ • Swagger docs         │  │  │
                                   │  │  │ • Health check         │  │  │
                                   │  │  └───────────────────────┘  │  │
                                   │  └───────────┬────────────────┘  │
                                   │              │                   │
                                   │  ┌───────────▼────────────────┐  │
                                   │  │  lib/ — Business Logic      │  │
                                   │  │  • auth.ts (NextAuth v5)    │  │
                                   │  │  • permissions.ts (RBAC)    │  │
                                   │  │  • scoring.ts (auto-score)  │  │
                                   │  │  • portal.ts (state engine) │  │
                                   │  │  • tokens.ts (opaque links) │  │
                                   │  │  • api-keys.ts (bearer auth)│  │
                                   │  │  • crypto.ts (AES-256-GCM)  │  │
                                   │  │  • rate-limit.ts            │  │
                                   │  │  • email/mailer.ts          │  │
                                   │  │  • pdf-report.tsx           │  │
                                   │  └───────────┬────────────────┘  │
                                   │              │                   │
                                   │  ┌───────────▼────────────────┐  │
                                   │  │  lib/db/ — Data Access      │  │
                                   │  │  • assessments.ts           │  │
                                   │  │  • vendors.ts               │  │
                                   │  │  • templates.ts             │  │
                                   │  │  • frameworks.ts            │  │
                                   │  │  • scoring.ts (reconcile)   │  │
                                   │  │  • collaboration.ts         │  │
                                   │  │  • compliance.ts            │  │
                                   │  │  • users.ts, roles.ts       │  │
                                   │  │  • notifications.ts         │  │
                                   │  │  • audit.ts                 │  │
                                   │  └───────────┬────────────────┘  │
                                   │              │                   │
                                   │  ┌───────────▼────────────────┐  │
                                   │  │  lib/settings/ — Config     │  │
                                   │  │  • DB-backed runtime config │  │
                                   │  │  • Encrypted secrets        │  │
                                   │  │  • CSS theme tokens         │  │
                                   │  └───────────┬────────────────┘  │
                                   │              │                   │
                                   │  ┌───────────▼────────────────┐  │
                                   │  │  lib/storage/ — File I/O    │  │
                                   │  │  • Local disk (default)     │  │
                                   │  │  • AWS S3                    │  │
                                   │  │  • Azure Blob               │  │
                                   │  └────────────────────────────┘  │
                                   └──────────────┬───────────────────┘
                                                  │
                              ┌───────────────────┼───────────────────┐
                              │                   │                   │
                      ┌───────▼──────┐   ┌────────▼────────┐   ┌─────▼──────┐
                      │  PostgreSQL   │   │  File System /   │   │   SMTP    │
                      │  (Prisma)     │   │  S3 / Blob       │   │  (SendGrid│
                      │               │   │  (Evidence)      │   │   etc.)   │
                      └───────────────┘   └─────────────────┘   └───────────┘
```

### 2.2 Request Flow Layers

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   INGRESS    │────▶│   SECURITY   │────▶│    AUTH      │────▶│   ROUTING    │
│              │     │              │     │              │     │              │
│ Reverse proxy│     │ proxy.ts     │     │ NextAuth v5  │     │ App Router   │
│ terminates   │     │ injects CSP  │     │ JWT session  │     │ Server       │
│ TLS, passes  │     │ nonce, adds  │     │ or API key   │     │ Components,  │
│ to :3000     │     │ HSTS, etc.   │     │ bearer token │     │ Actions,     │
│              │     │              │     │              │     │ Routes       │
└──────────────┘     └──────────────┘     └──────┬───────┘     └──────┬───────┘
                                                 │                    │
                                          ┌──────▼───────┐     ┌──────▼───────┐
                                          │   RBAC        │     │  VALIDATION  │
                                          │              │     │              │
                                          │ requirePerm() │     │ Zod schemas  │
                                          │ hasPermission()│    │ input guard  │
                                          │ UI gating     │     │ type narrow  │
                                          └──────┬───────┘     └──────┬───────┘
                                                 │                    │
                                          ┌──────▼────────────────────▼───────┐
                                          │        BUSINESS LOGIC              │
                                          │  scoring, portal engine, email,    │
                                          │  PDF reports, crypto, rate-limit   │
                                          └──────────────┬────────────────────┘
                                                         │
                                          ┌──────────────▼────────────────────┐
                                          │        DATA ACCESS (lib/db/)        │
                                          │  Typed Prisma queries, transactions │
                                          └──────────────┬────────────────────┘
                                                         │
                                          ┌──────────────▼────────────────────┐
                                          │         PERSISTENCE                │
                                          │  PostgreSQL  |  File Storage       │
                                          └───────────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Core Platform

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | Node.js | >= 22 | Application runtime |
| **Framework** | Next.js | 16 (App Router) | Full-stack server + client |
| **Language** | TypeScript | ^6 | Strict type safety |
| **Database** | PostgreSQL | >= 17 | Relational persistence |
| **ORM** | Prisma | ^7 | Typed DB access + migrations |
| **Auth** | Auth.js (NextAuth v5) | ^5 | JWT session management |

### 3.2 Frontend

| Technology | Purpose |
|---|---|
| **Tailwind CSS** | Utility-first styling (v4, CSS-variable tokens) |
| **shadcn/ui** | Accessible React primitives (Button, Card, Dialog, etc.) |
| **recharts** | Dashboard charts (donut, bar, area) |
| **@react-pdf/renderer** | PDF assessment reports |
| **lucide-react** | Icon library |
| **next-themes** | Dark/light mode toggle |

### 3.3 Infrastructure

| Technology | Purpose |
|---|---|
| **Docker Compose** | Containerized app + DB deployment |
| **Caddy / nginx** | Reverse proxy with automatic TLS |
| **Nodemailer** | SMTP email delivery |
| **@aws-sdk/client-s3** | AWS S3 cloud storage (optional) |
| **@azure/storage-blob** | Azure Blob cloud storage (optional) |
| **bcryptjs** | Password & API key hashing (12 rounds) |
| **Node crypto** | AES-256-GCM secret encryption, CSP nonces |

---

## 4. Data Model

### 4.1 Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              IDENTITY & ACCESS                                    │
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │     Role     │    │     User     │    │ SsoIdentity  │    │   ApiKey     │    │
│  │──────────────│    │──────────────│    │──────────────│    │──────────────│    │
│  │ id           │◄───│ roleId (FK)  │◄───│ userId (FK)  │    │ createdBy(FK)│───►│
│  │ name (unique)│    │ email (uniq) │    │ provider     │    │ name         │    │
│  │ description  │    │ name         │    │ providerId   │    │ keyHash (u)  │    │
│  │ permissions[]│    │ passwordHash │    └──────────────┘    │ keyPrefix    │    │
│  │ isSystem     │    │ disabled     │                        │ prefix       │    │
│  └──────────────┘    └──────┬───────┘                        │ disabled     │    │
│                             │                                │ expiresAt    │    │
│                             │ owns / reviews / resolves      │ allowedIps   │    │
│                             │                                │ rateLimit    │    │
│                             └───────────────┬────────────────┘ lastUsedAt   │    │
│                                             │                   └──────────────┘    │
└─────────────────────────────────────────────┼──────────────────────────────────────┘
                                              │
┌─────────────────────────────────────────────┼──────────────────────────────────────┐
│                              VENDOR MANAGEMENT                                     │
│                                             │                                       │
│  ┌──────────────┐                   ┌───────▼──────┐    ┌─────────────────────┐    │
│  │ VendorCert.  │                   │    Vendor    │    │     Attachment      │    │
│  │──────────────│                   │──────────────│    │─────────────────────│    │
│  │ id           │◄──────────────────│ id           │    │ id                  │    │
│  │ vendorId(FK) │                   │ name         │    │ entityType          │    │
│  │ name         │                   │ contactName  │    │ entityId            │    │
│  │ issuer       │                   │ contactEmail │    │ fileName            │    │
│  │ issuedDate   │                   │ tier (enum)  │    │ storageKey          │    │
│  │ expiresDate  │                   │ website      │    │ mimeType            │    │
│  └──────────────┘                   │ notes        │    │ sizeBytes           │    │
│                                     │ dataSensitiv │    │ displayName         │    │
│                                     │ contractRen. │    │ notes               │    │
│                                     │ ownerId (FK) │───►└─────────────────────┘    │
│                                     │ overallScore │                               │
│                                     │ lastAssess.  │                               │
│                                     └──────┬───────┘                               │
│                                            │                                       │
└────────────────────────────────────────────┼───────────────────────────────────────┘
                                             │
┌────────────────────────────────────────────┼───────────────────────────────────────┐
│                              ASSESSMENT ENGINE                                     │
│                                            │                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌─▼─────────────┐    ┌──────────────┐    │
│  │   Template   │    │   Section    │    │  Assessment    │    │  Assessment  │    │
│  │──────────────│    │──────────────│    │────────────────│    │  Question    │    │
│  │ id           │◄───│ templateId   │    │ id             │◄───│ assessmentId │    │
│  │ name         │    │ title        │    │ vendorId (FK)  │    │ sectionTitle │    │
│  │ description  │    │ order        │    │ templateId (FK)│    │ text         │    │
│  │ version      │    └──────┬───────┘    │ reviewerId(FK) │    │ type (enum)  │    │
│  │ status(enum) │           │            │ title          │    │ riskWeight   │    │
│  │ parentId(自) │    ┌──────▼───────┐    │ status (enum)  │    │ required     │    │
│  └──────────────┘    │   Question   │    │ dueDate        │    │ expectedAns  │    │
│                      │──────────────│    │ accessToken    │    │ options      │    │
│                      │ id           │    │ tokenHash      │    │ condLogic    │    │
│                      │ sectionId    │    │ tokenExpires   │    │ controlIds[] │    │
│                      │ text         │    │ portalPwHash   │    │ order        │    │
│                      │ helpText     │    │ recurrence     │    └──────┬───────┘    │
│                      │ type (enum)  │    │ nextRunAt      │           │            │
│                      │ riskWeight   │    │ score          │    ┌──────▼───────┐    │
│                      │ required     │    │ sentAt         │    │   Response   │    │
│                      │ expectedAns  │    │ submittedAt    │    │──────────────│    │
│                      │ options      │    └───────┬────────┘    │ id           │    │
│                      │ condLogic    │            │             │ assessmentId │    │
│                      │ order        │            │             │ questionId   │◄───┤
│                      └──────┬───────┘            │             │ value (Json) │    │
│                             │                    │             │ isNa         │    │
│                             │     ┌──────────────┼──────┐      │ isCompliant  │    │
│                             │     │              │      │      │ weightedScr  │    │
│                             │     │              │      │      │ maxScore     │    │
│                             │     │              │      │      └──────┬───────┘    │
│                             │     │              │      │             │            │
│                             │     │              │      │      ┌──────▼───────┐    │
│                             │     │              │      │      │ AnswerReview │    │
│                             │     │              │      │      │──────────────│    │
│                             │     │              │      │      │ responseId   │    │
│                             │     │              │      │      │ reviewerId   │    │
│                             │     │              │      │      │ decision     │    │
│                             │     │              │      │      │ note         │    │
│                             │     │              │      │      └──────────────┘    │
└─────────────────────────────┼─────┼──────────────┼──────┼──────────────────────────┘
                              │     │              │      │
┌─────────────────────────────┼─────┼──────────────┼──────┼──────────────────────────┐
│                  COMPLIANCE & COLLABORATION      │      │                           │
│                             │     │              │      │                           │
│  ┌──────────────┐    ┌──────▼──┐  │    ┌────────▼──┐   │    ┌──────────────┐       │
│  │  Framework   │    │ Control │  │    │  Finding   │   │    │   Comment    │       │
│  │──────────────│    │─────────│  │    │────────────│   │    │──────────────│       │
│  │ id           │◄───│ framewk │  │    │ id         │   │    │ id           │       │
│  │ name         │    │ domain  │  │    │ assessment │   │    │ assessmentId │       │
│  │ version      │    │ code    │  │    │ responseId │───┘    │ questionId   │       │
│  │ description  │    │ title   │  │    │ control.Cd │        │ parentId(自) │       │
│  └──────────────┘    │ guidance│  │    │ severity   │        │ authorType   │       │
│                      │ order   │  │    │ status     │        │ authorName   │       │
│                      └────▲────┘  │    │ title      │        │ body         │       │
│                           │       │    │ description│        │ visibility   │       │
│                ┌──────────┴──┐    │    │ resolvNote │        └──────────────┘       │
│                │QstnControl  │    │    │ resolvedBy │──►User                        │
│                │─────────────│    │    │ resolvedAt │                                │
│                │ questionId  │    │    └────────────┘                                │
│                │ controlId   │    │                                                  │
│                └─────────────┘    │                                                  │
│                                   │                                                  │
│                    ┌──────────▼──┐│    ┌──────────────┐                              │
│                    │  Evidence   ││    │ NtfnLog      │                              │
│                    │─────────────││    │──────────────│                              │
│                    │ id          ││    │ assessmentId │                              │
│                    │ assessmentId││    │ type         │                              │
│                    │ questionId  ││    │ sentTo       │                              │
│                    │ fileName    ││    │ subject      │                              │
│                    │ storageKey  ││    │ status       │                              │
│                    │ mimeType    ││    │ errorMsg     │                              │
│                    │ sizeBytes   ││    └──────────────┘                              │
│                    │ note        ││                                                   │
│                    └─────────────┘│                                                   │
└──────────────────────────────────┘└───────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                OPERATIONAL                                            │
│                                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                            │
│  │  AppSetting  │    │  AuditLog    │    │ PswdRstToken │                            │
│  │──────────────│    │──────────────│    │──────────────│                            │
│  │ id           │    │ id           │    │ id           │                            │
│  │ category     │    │ userId (FK)  │    │ userId (FK)  │                            │
│  │ key (unique) │    │ action       │    │ tokenHash    │                            │
│  │ value (Json) │    │ entityType   │    │ expiresAt    │                            │
│  │ isSecret     │    │ entityId     │    │ used         │                            │
│  └──────────────┘    │ meta (Json)  │    └──────────────┘                            │
│                      └──────────────┘                                                │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Key Relationships

| Relationship | Type | Cascade | Notes |
|---|---|---|---|
| User → Role | N:1 (roleId) | None | System roles Admin/Reviewer/Viewer seeded |
| User → Assessment | 1:N (reviewerId) | SetNull | Preserves history on user deletion |
| User → Vendor | 1:N (ownerId) | SetNull | Risk owner assignment |
| Vendor → Assessment | 1:N (vendorId) | Cascade | Delete vendor = delete all assessments |
| Assessment → AssessmentQuestion | 1:N | Cascade | Question snapshot frozen at creation |
| AssessmentQuestion → Response | 1:1 | Cascade | One response per question per assessment |
| Response → AnswerReview | 1:1 | Cascade | Reviewer decision per response |
| Response → Finding | 1:1 | SetNull | Auto-generated on non-compliant answers |
| Template → Section | 1:N | Cascade | Ordered sections |
| Section → Question | 1:N | Cascade | Ordered questions, risk-weighted |
| Question ↔ Control | M:N | Cascade | QuestionControl join table |
| Framework → Control | 1:N | Cascade | Controls under a framework |
| Assessment → Comment | 1:N | Cascade | Threaded comments (self-ref parentId) |
| Vendor → VendorCertification | 1:N | Cascade | Expiry-tracked certifications |
| Any entity → Attachment | Polymorphic | None | entityType + entityId pair |
| Control → CustomerResponsibilityAction | 1:N (via controlCode) | Cascade | Customer obligations for shared-responsibility controls |

### 4.3 Enums

| Enum | Values | Default |
|---|---|---|
| **TemplateStatus** | `DRAFT`, `PUBLISHED`, `ARCHIVED` | `DRAFT` |
| **QuestionType** | `YES_NO`, `MULTIPLE_CHOICE`, `FREE_TEXT`, `FILE_UPLOAD`, `DATE`, `NUMERIC`, `COMBOBOX`, `MULTI_SELECT`, `RATING`, `URL`, `EMAIL`, `CHECKBOX` | — |
| **RiskWeight** | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` | `MEDIUM` |
| **VendorTier** | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | — |
| **DataSensitivity** | `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED` | — |
| **AssessmentStatus** | `DRAFT`, `SENT`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `COMPLETED`, `OVERDUE` | `DRAFT` |
| **Recurrence** | `NONE`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `BIANNUALLY`, `ANNUALLY` | `NONE` |
| **FindingStatus** | `OPEN`, `REMEDIATED`, `RISK_ACCEPTED` | `OPEN` |

### 4.4 Question Type Auto-Scoring Matrix

| Type | Scorable? | Compliance Logic |
|---|---|---|
| `YES_NO` | Yes | String equality vs expectedAnswer |
| `MULTIPLE_CHOICE` | Yes | String equality vs expectedAnswer |
| `NUMERIC` | Yes | Numeric equality (`Number()`) |
| `RATING` | Yes | Numeric equality (`Number()`) |
| `COMBOBOX` | Yes | String equality vs expectedAnswer |
| `MULTI_SELECT` | Yes | Sorted array comparison (same length, all match) |
| `CHECKBOX` | Yes | Boolean coercion (`parseBoolean()`) |
| `FREE_TEXT` | No | Manual review only |
| `FILE_UPLOAD` | No | Manual review only |
| `DATE` | No | Manual review only |
| `URL` | No | Manual review only |
| `EMAIL` | No | Manual review only |

---

## 5. Authentication & Authorization

### 5.1 Authentication Methods

```
                     ┌─────────────────────┐
                     │    Request Ingress   │
                     └──────────┬──────────┘
                                │
                     ┌──────────▼──────────┐
                     │  Has Session Cookie? │
                     └─────┬─────────┬─────┘
                      Yes  │         │  No
              ┌────────────▼──┐  ┌──▼──────────────────┐
              │ NextAuth      │  │ Has Authorization   │
              │ JWT Session   │  │ Bearer token?       │
              │ (internal     │  └──┬─────────────┬────┘
              │  dashboard)   │  Yes│             │ No
              └───────┬───────┘  ┌──▼──────────┐ │
                      │          │ API Key Auth │ │
                      │          │ • mrk_ prefix│ │
                      │          │ • bcrypt cmp │ │
                      │          │ • IP allowlst│ │
                      │          │ • Expiry chk │ │
                      │          │ • Rate limit │ │
                      │          └──────┬───────┘ │
                      │                 │         │
              ┌───────▼─────────────────▼────┐ ┌──▼──────────┐
              │     Permission Check         │ │ Public /    │
              │  requirePermission(key)      │ │ Unathenticated│
              │  hasPermission(key)          │ │ (portal)    │
              └──────────────────────────────┘ └─────────────┘
```

### 5.2 Session Auth (NextAuth v5)

- **Strategy:** JWT (stateless), no database session store
- **Session expiry:** Sliding-window JWT `exp` claim via `computeSessionExpiry()`. Configurable via `sessionTimeoutMinutes` in Settings (default 30 min). The `exp` claim is refreshed on each authenticated request. `sessionTimeoutMinutes = 0` disables server-side expiry
- **Providers:**
  - **Credentials** — email + bcryptjs password (12 rounds), rate-limited at login
  - **Microsoft Entra ID** — OIDC, configurable via Settings
  - **Google** — OAuth 2.0, configurable via Settings
  - **Generic OIDC** — Custom issuer/provider, configurable via Settings
- **Session payload:** `{ userId, roleId, roleName, permissions[] }` — permissions hydrated from Role table
- **Audit:** Every login creates an AuditLog entry

#### Login & SSO Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────────┐
│  /login   │     │ NextAuth │     │  lib/    │     │  PostgreSQL  │
│  (Page)   │     │  v5 API  │     │  auth.ts │     │  (Prisma)    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └──────┬───────┘
     │                │               │                   │
     │  POST email/pw │               │                   │
     │───────────────▶│               │                   │
     │                │ rateLimit()   │                   │
     │                │──────────────▶│                   │
     │                │               │                   │
     │                │ validate()    │                   │
     │                │──────────────▶│                   │
     │                │               │ findUser()        │
     │                │               │──────────────────▶│
     │                │               │ user + hash       │
     │                │               │◀──────────────────│
     │                │               │                   │
     │                │ bcrypt.compare│                   │
     │                │──────────────▶│                   │
     │                │               │ logAudit("LOGIN") │
     │                │               │──────────────────▶│
     │                │               │                   │
     │                │ JWT cookie    │                   │
     │◀───────────────│               │                   │
     │                │               │                   │
     │  Redirect → /dashboard                                │
     │───────────────────────────────────────────────────────▶│
```

#### Break-Glass Local Auth

When SSO is enforced (`disableLocalAuth = true`), a break-glass token allows local login:

1. Admin generates `breakGlassToken` via `lib/break-glass.ts`
2. Token hash stored in `AppSetting` (`sso.breakGlassHash`)
3. `shouldShowLocalAuth()` returns `true` only if valid break-glass token in URL
4. Rate-limited: `breakGlassPerMin` (default 10/min)

### 5.3 API Key Auth (Bearer Token)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │ api-auth │     │ api-keys │     │PostgreSQL│
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │               │                  │
     │  Bearer mrk_   │               │                  │
     │  <token>       │               │                  │
     │───────────────▶│               │                  │
     │                │               │                  │
     │                │ Extract 8-hex │                  │
     │                │ prefix        │                  │
     │                │──────────────▶│                  │
     │                │               │                  │
     │                │               │ findMany(keyPre)│
     │                │               │─────────────────▶│
     │                │               │ candidates[]    │
     │                │               │◀─────────────────│
     │                │               │                  │
     │                │               │ For each:        │
     │                │               │ ✓ not disabled   │
     │                │               │ ✓ not expired    │
     │                │               │ ✓ IP in CIDR     │
     │                │               │ ✓ bcrypt match   │
     │                │               │ ✓ rate limit     │
     │                │               │                  │
     │                │ ALL_PERMISSIONS                  │
     │                │◀──────────────│                  │
     │                │               │                  │
     │  200 OK + data │               │                  │
     │◀───────────────│               │                  │
```

**Key Format:** `mrk_<8-hex-prefix>.<48-hex-secret>`

- `mrk_` namespace prefix for identification
- 8-char hex prefix stored in `keyPrefix` for indexed DB lookup (prevents full table scan)
- 48-char hex secret bcrypt-hashed (12 rounds), stored as `keyHash`
- API keys can be **scoped** to a specific set of permissions (via `permissions[]`). When left empty (default), the key retains full access (ALL_PERMISSIONS) for backward compatibility. Scoped keys are restricted to only the granted permissions
- IP allowlisting via CIDR matching (`ipInCidr()`)
- Configurable per-key rate limit (`rateLimitPerMin`)

### 5.4 Role-Based Access Control (RBAC)

#### Permission Catalog (23 keys)

```
┌─────────────────┬──────────────────────────────────────────────┐
│ Resource        │ Permissions                                  │
├─────────────────┼──────────────────────────────────────────────┤
│ Vendors         │ vendors:view, vendors:create,                │
│                 │ vendors:edit, vendors:delete                 │
├─────────────────┼──────────────────────────────────────────────┤
│ Assessments     │ assessments:view, assessments:create,        │
│                 │ assessments:edit, assessments:review,        │
│                 │ assessments:delete                           │
├─────────────────┼──────────────────────────────────────────────┤
│ Templates       │ templates:view, templates:create,            │
│                 │ templates:edit, templates:delete             │
├─────────────────┼──────────────────────────────────────────────┤
│ Frameworks      │ frameworks:view, frameworks:edit,            │
│                 │ frameworks:delete                           │
├─────────────────┼──────────────────────────────────────────────┤
│ Audit           │ audit:view                                  │
├─────────────────┼──────────────────────────────────────────────┤
│ Administration  │ users:manage, roles:manage,                  │
│                 │ settings:manage, api:manage,                 │
│                 │ webhooks:manage                              │
├─────────────────┼──────────────────────────────────────────────┤
│ Profile         │ profile:view                                 │
└─────────────────┴──────────────────────────────────────────────┘
```

#### Default System Roles

| Role | Permissions Count | Description |
|---|---|---|
| **Admin** | 23 (all) | Full system control (locked, cannot be deleted) |
| **Reviewer** | 17 | Vendor/Assessment/Template/Framework CRUD. Cannot manage users, roles, settings, API, or view audit |
| **Viewer** | 5 | Read-only: `vendors:view`, `assessments:view`, `templates:view`, `frameworks:view`, `profile:view` |

#### Enforcement Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         RBAC LAYERS                              │
│                                                                  │
│  Layer 1: PAGE ACCESS                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ const user = await requirePermission(PERMISSIONS.X_VIEW) │    │
│  │ → Redirects to /dashboard if denied                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│  Layer 2: UI GATING (hide, not disable)                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ {hasPermission(user.permissions, key) && <WriteButton />} │    │
│  │ → Controls are hidden from HTML, not greyed out          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│  Layer 3: SERVER ACTION GATING                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ export async function deleteVendor(id) {                 │    │
│  │   await requirePermission(PERMISSIONS.VENDORS_DELETE)    │    │
│  │   // ... business logic                                 │    │
│  │ }                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│  Layer 4: API ROUTE GATING                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ const auth = await authenticateRequest(request)          │    │
│  │ if (!authResultHasPermission(auth, "vendors:view")) {    │    │
│  │   return apiError("Forbidden", 403)                      │    │
│  │ }                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│  Layer 5: SIDEBAR NAVIGATION                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ sidebar items filtered by hasPermission(permissions, ...) │    │
│  │ Viewer sees: Vendors, Assessments, Risk Register only    │    │
│  │ Admin sees: All items including Settings                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Assessment Lifecycle & Scoring

### 6.1 Assessment Lifecycle State Machine

```
                              ┌──────────┐
                              │   DRAFT  │
                              └────┬─────┘
                                   │ send (token generated, email sent)
                                   │
                            ┌──────▼──────┐
                            │    SENT     │
                            └──────┬──────┘
                                   │ vendor opens portal link
                                   │
                            ┌──────▼──────────┐
                            │  IN_PROGRESS    │◄──────────────┐
                            └──────┬──────────┘               │
                                   │ vendor submits           │
                                   │                          │
                            ┌──────▼──────┐   reviewer        │
                            │  SUBMITTED  │   requests        │
                            └──────┬──────┘   clarification   │
                                   │───────────────┬──────────┘
                            reviewer opens review  │
                                   │               │
                            ┌──────▼──────┐        │
                            │ UNDER_REVIEW│        │
                            └──────┬──────┘        │
                                   │               │
                            complete review        │
                                   │               │
                            ┌──────▼──────┐        │
                            │  COMPLETED  │        │
                            └─────────────┘        │
                                                   │
                            ┌──────────┐            │
                            │ OVERDUE  │◄──┐        │
                            └──────────┘   │ cron scans for
                                           │ past-due SENT/
                                           │ IN_PROGRESS
```

**Transitions:**

| From | To | Trigger |
|---|---|---|
| `DRAFT` | `SENT` | Staff clicks "Send" — token generated, email dispatched |
| `SENT` | `IN_PROGRESS` | Vendor loads portal, starts answering |
| `IN_PROGRESS` | `SUBMITTED` | Vendor clicks "Submit" |
| `SUBMITTED` | `UNDER_REVIEW` | Reviewer opens assessment review |
| `SUBMITTED` | `IN_PROGRESS` | Reviewer requests clarification |
| `UNDER_REVIEW` | `COMPLETED` | Reviewer finalizes review |
| `SENT` / `IN_PROGRESS` | `OVERDUE` | Cron detects past due date + escalation threshold |

### 6.2 Question Snapshot Mechanism

When an assessment is created from a template, questions are **frozen** into `AssessmentQuestion` rows:

```
┌──────────────────┐                    ┌──────────────────────────────┐
│    TEMPLATE       │                    │     ASSESSMENT                │
│                   │                    │                               │
│  ┌─ Section 1    │   createAssessment │  ┌─ Section 1 (frozen)        │
│  │  ├─ Q1        │───────────────────▶│  │  ├─ AssessmentQuestion 1   │
│  │  ├─ Q2        │                    │  │  ├─ AssessmentQuestion 2   │
│  │  └─ Q3        │                    │  │  └─ AssessmentQuestion 3   │
│  └─ Section 2    │                    │  └─ Section 2 (frozen)        │
│     ├─ Q4        │                    │     ├─ AssessmentQuestion 4   │
│     └─ Q5        │                    │     └─ AssessmentQuestion 5   │
└──────────────────┘                    └──────────────────────────────┘

  Template edits after creation do NOT affect existing assessments.
  Each AssessmentQuestion persists: text, helpText, type, riskWeight,
  expectedAnswer, options, conditionalLogic, controlIds at create time.
```

### 6.3 Scoring Engine

#### Scoring Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Questions  │    │  Responses  │    │  Scoring    │    │  Findings   │
│  (snapshot) │───▶│  (answers)  │───▶│  Engine     │───▶│  Reconcil.  │
└─────────────┘    └─────────────┘    └──────┬──────┘    └──────┬──────┘
                                             │                  │
                                      ┌──────▼──────┐    ┌──────▼──────┐
                                      │ Per-Response│    │  Upsert     │
                                      │   Score     │    │  Findings   │
                                      └──────┬──────┘    └─────────────┘
                                             │
                                      ┌──────▼──────┐
                                      │ Assessment  │
                                      │   Score     │
                                      └──────┬──────┘
                                             │
                                      ┌──────▼──────┐
                                      │ Vendor      │
                                      │ overallScore│
                                      └─────────────┘
```

#### Algorithm Detail

```typescript
// Per question-response pair:
if (response.isNotApplicable) {
  weightedScore = 0
  maxScore = 0
  isCompliant = null
} else {
  isCompliant = checkCompliance(type, value, expectedAnswer)
  // For MULTIPLE_CHOICE and COMBOBOX, expectedAnswer may be an array
  // (any-of): isCompliant = acceptedAnswers.includes(value)
  // For YES_NO, equals/notEquals are case-insensitive.
  weight = riskWeights[question.riskWeight]   // CRITICAL=10, HIGH=6, MEDIUM=3, LOW=1
  weightedScore = isCompliant ? weight : 0
  maxScore = isCompliant === null ? 0 : weight   // unscorable = excluded
}

// Assessment total score:
// Responses are batched by identical result tuples and written via
// updateMany (not per-row), keeping round-trips proportional to distinct
// outcomes rather than question count.
totalScore = sum(weightedScore) / sum(maxScore)   // 0–1 ratio

// RAG classification:
score >= 0.85 → GREEN
0.60 <= score < 0.85 → AMBER
score < 0.60 → RED
null → UNSCORED
```

#### Configurable Parameters

| Parameter | Default | Location |
|---|---|---|
| CRITICAL weight | 10 | `scoring.riskWeights` |
| HIGH weight | 6 | `scoring.riskWeights` |
| MEDIUM weight | 3 | `scoring.riskWeights` |
| LOW weight | 1 | `scoring.riskWeights` |
| GREEN threshold | >= 0.85 | `scoring.ragThresholds` |
| AMBER threshold | >= 0.60 | `scoring.ragThresholds` |
| Exclude N/A | true | `scoring.excludeNotApplicable` |

#### Domain Compliance Radar

Per-vendor, per-framework **domain compliance** is visualised as a radar chart
(`getVendorDomainRadar` → `components/compliance-radar.tsx`) on the framework
page. Each axis is a framework domain; the radius is a fixed 0–100% scale; and
the chart overlays the **current vs previous** completed assessment using the
same risk-weighted formula as the overall score (weighted compliant ÷ weighted
total, N/A and unscorable excluded). A "Download PDF report" action renders the
radar as a `Domain | Current | Previous | Change` table plus a per-control
heatmap (`lib/framework-report.tsx`) for auditors.

#### Findings Reconciliation

After scoring, the engine reconciles findings:

1. **Auto-findings:** For each non-compliant auto-scored response, upserts a Finding (keyed by `responseId`)
2. **Preservation:** Reviewer-set `status`, `resolutionNote`, and `resolvedById` are preserved on upsert
3. **Cleanup:** Deletes auto-findings for responses that became compliant
4. **Controls:** Resolves `controlCodes[]` in batch (avoids N+1 queries)
5. **Manual findings:** Findings with `responseId = null` (created manually) are untouched
6. **Vendor update:** Updates `vendor.overallScore` and `vendor.lastAssessedAt`

### 6.4 Review & Collaboration

```
┌─────────────────────────────────────────────────────────────────┐
│                     REVIEW WORKFLOW                              │
│                                                                  │
│  ┌─────────────┐                                                │
│  │ SUBMITTED   │                                                │
│  └──────┬──────┘                                                │
│         │ Reviewer opens review panel (per-question)             │
│         │                                                        │
│  ┌──────▼──────┐    Reviewer makes decision:                     │
│  │ UNDER_REVIEW│    • APPROVED — answer accepted as compliant     │
│  └──────┬──────┘    • CLARIFICATION_REQUESTED — send back to     │
│         │              vendor with note, portal reopens           │
│         │                                                        │
│         │  Comments can be attached per-question with visibility: │
│         │    • INTERNAL — staff-only, never shown to vendor       │
│         │    • VENDOR — visible in vendor's portal (read-only)    │
│         │                                                        │
│  ┌──────▼──────┐                                                │
│  │  COMPLETED  │  Score recalculated, findings updated            │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Customer Responsibility Tracking

### 7.1 Overview

When a vendor holds a certification (e.g., SOC 2, ISO 27001), certain compliance controls become **shared responsibility** — the customer (you) also has obligations to maintain. Mitch-Risk tracks these obligations alongside each vendor certification.

### 7.2 Model

```
┌────────────────────────┐     ┌───────────────────────────────┐
│       Control          │     │ CustomerResponsibilityAction   │
│────────────────────────│     │───────────────────────────────│
│ isSharedResponsibility ├────▶│ vendorId (FK → Vendor)        │
│ (boolean)              │     │ certificationId (FK, optional) │
└────────────────────────┘     │ controlCode                   │
                               │ frameworkName                 │
                               │ controlTitle                  │
                               │ status (enum)                 │
                               │   PENDING / IN_PROGRESS       │
                               │   COMPLETED / NOT_APPLICABLE  │
                               │ assignedToId (FK → User)      │
                               │ notes                         │
                               │ completedAt                   │
                               └───────────────────────────────┘
```

### 7.3 Workflow

```
1. Admin marks controls as shared responsibility
   └── Framework → Control → toggle isSharedResponsibility
       (SharedResponsibilityToggle component)

2. Vendor certification is saved
   └── Certification saved → auto-generate
       CustomerResponsibilityAction rows for each
       shared control in the chosen framework

3. Staff track obligations on vendor detail page
   └── CustomerResponsibilityChecklist component
       • Per-row expand/collapse (matches review-panel pattern)
       • Status dropdown (Pending / In Progress / Completed / N/A)
       • Assigned staff member
       • Notes field
       • Evidence attachments via Attachment model

4. Compliance metrics surfaced
   └── Vendor detail: split metrics (assessment score +
       responsibility compliance %)
   └── Risk Register: filter toggle for responsibility actions
   └── Dashboard API: portfolio-level responsibility summary
   └── Vendor CSV export: responsibility section
   └── Assessment PDF report: responsibility compliance in score section
```

### 7.4 Key Files

| Layer | Files |
|---|---|
| Schema | `prisma/schema.prisma` — `CustomerResponsibilityAction` model, `CustomerResponsibilityStatus` enum, `isSharedResponsibility` on Control |
| DB | `lib/db/customer-responsibility.ts` — CRUD, compliance scoring, portfolio summary |
| Actions | `lib/actions/customer-responsibility.ts` — status updates, evidence upload/remove |
| Framework | `lib/actions/frameworks.ts` — toggle shared responsibility |
| Certifications | `lib/actions/certifications.ts` — auto-generate on cert save |
| Components | `components/customer-responsibility-checklist.tsx`, `components/customer-responsibility-manager.tsx`, `components/shared-responsibility-toggle.tsx` |

---

## 8. Vendor Portal Flow

### 8.1 Portal Architecture

The vendor portal is a **no-login**, token-based experience. No vendor account is created — the assessment token in the URL is the sole authentication mechanism.

```
┌──────────────────────────────────────────────────────────────────┐
│                    PORTAL URL STRUCTURE                           │
│                                                                   │
│  https://app.example.com/portal/<accessToken>                      │
│                                  │                                │
│                                  └── 43-char base64url string      │
│                                      (32 random bytes)             │
│                                      Generated at assessment send  │
│                                      Stored as:                    │
│                                        • accessToken (unhashed)    │
│                                        • tokenHash (SHA-256)       │
│                                        • tokenExpiresAt (config)   │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Portal Request Lifecycle

```
                    GET /portal/<token>
                           │
                    ┌──────▼──────┐
                    │ Rate Limit  │
                    │ (portalPage │
                    │ LoadsPerMin)│
                    └──────┬──────┘
                           │ OK
                    ┌──────▼──────────────────────┐
                    │ Lookup assessment by token hash   │
                    │ (WHERE tokenHash = SHA-256(token)) │
                    └──────┬──────────────────────┘
                           │
          ┌────────────────┼────────────────────┐
          │                │                    │
    Token not found   Token expired       Token valid
          │                │                    │
    ┌─────▼─────┐   ┌─────▼─────┐              │
    │   404     │   │  "Link    │              │
    │ Not Found │   │  expired" │              │
    └───────────┘   └───────────┘     ┌────────▼────────┐
                                      │ Check Status    │
                                      └──┬──────┬───┬──┘
                                         │      │   │
                              SUBMITTED/ │  DRAFT/│ SENT/
                              UNDER_     │  before│ IN_PROGRESS
                              REVIEW/    │  send  │
                              COMPLETED  │        │
                                         │        │
                              ┌──────────▼──┐ ┌───▼─────────┐
                              │ Read-only   │ │ "Not yet    │
                              │ view with:  │ │ available"  │
                              │ • Answers   │ │             │
                              │ • Review    │ └─────────────┘
                              │   decisions │
                              │ • Comments  │ ┌───▼─────────────────────┐
                              └─────────────┘ │ Password Protected?     │
                                              └──┬──────────────────┬───┘
                                            Yes  │                  │ No
                                    ┌────────────▼──┐               │
                                    │ PasswordGate  │               │
                                    │ • Rate limited│               │
                                    │ • Sets cookie │               │
                                    │   "portal-    │               │
                                    │   auth"       │               │
                                    │ • bcrypt cmp  │               │
                                    └───────┬───────┘               │
                                            │ OK                    │
                                    ┌───────▼───────────────────────▼──┐
                                    │     PortalQuestionnaire           │
                                    │     (Client Component)            │
                                    │                                   │
                                    │  • Conditional question display   │
                                    │  • Auto-save progress             │
                                    │  • File upload                    │
                                    │  • Submit (finalize answers)      │
                                    │  • Re-clarification (IN_PROGRESS) │
                                    └──────────────────────────────────┘
```

Multi-section questionnaires are presented one section per page with
Back/Continue navigation and a review page before final submission.
Single-section templates render as a continuous scroll. Conditional logic
`equals`/`notEquals` comparisons are case-insensitive.

### 8.3 Conditional Question Logic

Questions can be conditionally shown/hidden based on answers to previous questions:

```
Question: "Do you have a business continuity plan?"   [YES/NO]
  │
  ├── If YES → Show: "When was the plan last tested?"   (DATE)
  │                Show: "Upload your BCP document"      (FILE_UPLOAD)
  │
  └── If NO  → Hide above questions

Logic stored as JSON on Question.conditionalLogic:
{
  "match": "all",          // "all" = AND, "any" = OR
  "rules": [
    { "questionId": "<qid>", "operator": "equals", "value": "YES" }
  ]
}

Supported operators:
  equals, notEquals, contains, notContains,
  gt, lt, gte, lte, answered, notAnswered
```

### 8.4 Portal Security

| Concern | Mechanism |
|---|---|
| URL guessing | 43-char base64url token (2^256 search space) |
| Token expiry | Configurable TTL (default 30 days), server-enforced |
| Token revocation | Delete `accessToken` on Assessment (renders URL dead) |
| Password protection | Optional bcrypt-hashed portal password, rate-limited |
| Brute force | Rate-limited at page load, upload, submit, password attempt |
| Data isolation | Vendor sees only their assessment, no other vendor data |
| File uploads | MIME type validation, rate-limited, server-side only |
| Comment visibility | INTERNAL comments never rendered in portal |

---

## 9. File Storage Architecture

### 9.1 Storage Interface

```typescript
interface FileStorage {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  list(): Promise<StoredFile[]>;
}

type StoredFile = { key: string; modifiedAt: Date };
```

### 9.2 Provider Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     getStorage() Factory                      │
│                                                               │
│  1. Read storageSettings from AppSetting table                │
│  2. Decrypt S3/Azure secrets via AES-256-GCM                  │
│  3. Compute settings fingerprint (provider + credentials)     │
│  4. If fingerprint changed → re-resolve provider              │
│  5. Return cached FileStorage instance                        │
│                                                               │
│  Graceful degradation: if S3/Azure init fails,                │
│  falls back to local disk with warning.                       │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
    ┌──────────▼──────────┐          ┌─────────▼──────────┐
    │   Local Disk         │          │   Cloud Providers  │
    │   (default)          │          │                    │
    │                      │          │  ┌──────────────┐  │
    │  Path:               │          │  │   AWS S3     │  │
    │  EVIDENCE_STORAGE_   │          │  │──────────────│  │
    │  PATH (env var)      │          │  │ bucket       │  │
    │  default:             │          │  │ region       │  │
    │  ./.storage/evidence │          │  │ accessKeyId  │  │
    │                      │          │  │ secretKey    │  │
    │  Security:           │          │  └──────────────┘  │
    │  • resolve() +       │          │                    │
    │    startsWith() check│          │  ┌──────────────┐  │
    │  • No path traversal │          │  │ Azure Blob   │  │
    └──────────────────────┘          │  │──────────────│  │
                                      │  │ connectionStr │  │
                                      │  │ containerName │  │
                                      │  │ (SAS support) │  │
                                      │  └──────────────┘  │
                                      └────────────────────┘
```

### 9.3 File Serving

```
                    GET /api/attachments/<attachmentId>
                              │
                       ┌──────▼──────┐
                       │ Auth Check  │
                       │ (session or │
                       │  API key)   │
                       └──────┬──────┘
                              │ Authenticated
                       ┌──────▼──────┐
                       │ Lookup      │
                       │ Attachment  │
                       │ by ID       │
                       └──────┬──────┘
                              │ Found
                       ┌──────▼──────┐
                       │ storage.read│
                       │ (storageKey)│
                       └──────┬──────┘
                              │
                       ┌──────▼──────────────────┐
                       │ Response:               │
                       │ Content-Type: mimeType  │
                       │ Content-Disposition:    │
                       │   inline; filename=...  │
                       │ Body: Buffer            │
                       └─────────────────────────┘

  Never: serve files directly from public/ or raw storage URLs.
  Always: go through the authenticated route.
```

### 9.4 Upload Validation

All file uploads pass through `lib/upload-validation.ts`:

- **Magic-byte validation:** File signatures checked against expected bytes for the declared extension (pdf, png, jpg, jpeg, gif, webp, docx, xlsx)
- **MIME type blocklist:** HTML, JS, SVG, PHP, XML, executables, shell scripts
- **Size limits:** Configurable `maxUploadMb` (default 20 MB)
- **Extension allowlist:** Configurable (default: pdf, png, jpg, jpeg, docx, xlsx)

### 9.5 Attachment Lifecycle

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  UPLOAD      │    │  COPY        │    │  DELETE      │
│              │    │              │    │              │
│ User uploads │    │ Evidence →   │    │ Entity       │
│ → storage    │    │ Attachment   │    │ deleted →    │
│   .save()    │    │ storage.read │    │ orphan scan  │
│ → Attachment │    │ → new key    │    │ via cron     │
│   row        │    │ → storage    │    │ (backstop)   │
│              │    │   .save()    │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
```

**Key design: Files are copied, not symlinked.** Deleting the source entity (e.g., assessment) does not affect the attachment's copy.

---

## 10. Email System

### 10.1 Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Trigger    │    │   Mailer     │    │   Template   │    │   Delivery   │
│              │    │              │    │              │    │              │
│ • Server     │───▶│ sendEmail()  │───▶│ React Email  │───▶│ Nodemailer   │
│   Action     │    │              │    │ Component    │    │ SMTP         │
│ • Cron job   │    │ • Resolve    │    │              │    │ Transport    │
│              │    │   settings   │    │ ● Dynamic    │    │              │
│              │    │ • Decrypt    │    │   heading +  │    │ ● SendGrid   │
│              │    │   SMTP pass  │    │   body        │    │   (SMTP      │
│              │    │ • Replace    │    │ ● Token      │    │   relay)     │
│              │    │   tokens     │    │   variables   │    │ ● Any SMTP  │
│              │    │ • Log audit  │    │   substitution│    │   provider   │
│              │    │ • Return     │    │              │    │              │
│              │    │   status     │    └──────────────┘    └──────────────┘
└──────────────┘    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │NotificationLog│
                    │──────────────│
                    │ id           │
                    │ assessmentId │
                    │ type          │
                    │ sentTo        │
                    │ subject       │
                    │ status        │
                    │ errorMessage  │
                    │ sentAt        │
                    └──────────────┘
```

### 10.2 Email Template Types

| Type | Trigger | Recipient | From |
|---|---|---|---|
| **Invite** | Assessment sent | Vendor contact | System SMTP |
| **Invite (password)** | Password-protected assessment sent | Vendor contact | System SMTP |
| **Reminder** | Cron: due in N days | Vendor contact | System SMTP |
| **Escalation** | Cron: overdue | Reviewer (staff) | System SMTP |
| **Submission** | Vendor submits | Reviewer (staff) | System SMTP |
| **Clarification** | Reviewer requests clarification | Vendor contact | System SMTP |
| **Reset** | Password reset requested | Staff user | System SMTP |
| **Expiry** | Cron: cert/contract expiring | Risk owner (staff) | System SMTP |

### 10.3 Template Customization

All email subjects and bodies are DB-backed via `email.template` AppSetting category:

```json
{
  "inviteSubject": "Risk Assessment: {{assessmentTitle}}",
  "inviteBody": "Dear {{vendorName}},\n\nPlease complete the assessment...",
  "invitePasswordBody": "...\n\nThe assessment is password-protected: {{portalPassword}}",
  "reminderSubject": "Reminder: {{assessmentTitle}} due {{dueDate}}",
  "escalationSubject": "ESCALATION: {{vendorName}} overdue",
  "submissionSubject": "Submission: {{vendorName}} — {{assessmentTitle}}",
  "clarificationSubject": "Additional information needed: {{assessmentTitle}}",
  "resetSubject": "{{appName}} — Password Reset",
  "expirySubject": "Expiring: {{itemName}} for {{vendorName}}",
  "expiryBody": "...expires on {{expiresIn}}..."
}
```

Available token variables: `{{vendorName}}`, `{{assessmentTitle}}`, `{{portalUrl}}`, `{{dueDate}}`, `{{reviewerName}}`, `{{assessmentUrl}}`, `{{message}}`, `{{appName}}`, `{{resetUrl}}`, `{{expiresIn}}`, `{{itemName}}`, `{{vendorUrl}}`, `{{portalPassword}}`.

### 10.4 Email Logging & Retention

- Every sent email creates a `NotificationLog` row (type, recipient, subject, status)
- Failed sends record `errorMessage`
- Cron job prunes logs older than `emailLogRetentionDays` (default 14 days, configurable)
- Idempotency: reminder/escalation checks for existing SENT log before re-sending

---

## 11. Settings & Configuration

### 11.1 Design Philosophy

All operational configuration lives in the `AppSetting` database table. No config files need editing after initial deployment bootstrap (DATABASE_URL, AUTH_SECRET, APP_ENCRYPTION_KEY, CRON_SECRET, APP_URL).

```
┌─────────────────────────────────────────────────────────────────┐
│                    SETTINGS ARCHITECTURE                         │
│                                                                  │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐             │
│  │ AppSetting │    │  Schema    │    │  Accessor  │             │
│  │ (DB Row)   │    │  (Zod)     │    │  (Cache)   │             │
│  │────────────│    │────────────│    │────────────│             │
│  │ id         │    │ Per-cat    │    │ React       │             │
│  │ category   │    │ validation │    │ cache() for │             │
│  │ key (uniq) │    │ Types      │    │ per-req     │             │
│  │ value(Json)│    │ Defaults    │    │ dedup       │             │
│  │ isSecret   │    │             │    │             │             │
│  │ updatedAt  │    └────────────┘    └────────────┘             │
│  └────────────┘                                                  │
│         │                                                        │
│         │  isSecret=true fields encrypted at rest                 │
│         │  via AES-256-GCM (APP_ENCRYPTION_KEY)                  │
│         │                                                        │
│         │  Secrets NEVER returned to client                      │
│         │  (e.g., smtpPasswordConfigured: boolean)               │
│         │                                                        │
│         ├── organization: name, supportEmail                     │
│         ├── email: smtpHost, smtpPort, smtpUser, fromAddress,    │
│         │         fromName, smtpPassword (secret)                │
│         ├── files: maxUploadMb, allowedExtensions[]              │
│         ├── scoring: riskWeights, ragThresholds,                 │
│         │           excludeNotApplicable                          │
│         ├── assessments: defaultDueInDays, reminderOffsetDays,   │
│         │                escalationAfterDays, all rate-limits,   │
│         │                sessionTimeoutMinutes,                  │
│         │                emailLogRetentionDays                   │
│         ├── email.template: all 16 subject/body pairs            │
│         ├── sso: entraId*, google*, oidc*, autoProvisionRoleId,  │
│         │       allowedDomain, disableLocalAuth                  │
│         ├── appearance: primaryHex, secondaryHex, logoKey,       │
│         │               ragGreenHex, ragAmberHex, ragRedHex,     │
│         │               ragUnscoredHex, borderRadius, pageWidth  │
│         └── storage: provider, s3*, azure* (secrets encrypted)    │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Secret Encryption

```
┌─────────────────────────────────────────────────────────────────┐
│                 ENCRYPTION AT REST FLOW                          │
│                                                                  │
│  APP_ENCRYPTION_KEY (env, min 32 chars)                          │
│       │                                                          │
│       ▼                                                          │
│  SHA-256 → 32-byte key                                           │
│       │                                                          │
│       ▼                                                          │
│  AES-256-GCM encrypt(plaintext, key)                             │
│       │                                                          │
│       ▼                                                          │
│  base64(IV) : base64(authTag) : base64(ciphertext)              │
│       │                                                          │
│       ▼                                                          │
│  Stored in AppSetting.value (isSecret = true)                    │
│                                                                  │
│  Decrypt: reverse the flow.                                      │
│  If key rotated (old key ≠ current), decryption fails →          │
│  returns null gracefully (no 500, feature degrades).             │
│                                                                  │
│  Encrypted secrets:                                              │
│    smtpPassword, entraIdClientSecret, googleClientSecret,        │
│    oidcClientSecret, s3SecretAccessKey, azureConnectionString    │
└─────────────────────────────────────────────────────────────────┘
```

### 11.3 CSS Theme Tokens

`lib/theme-tokens.tsx` injects a `<style>` tag into every page:

- Reads `AppearanceSettings` for brand colors, RAG palette, border radius
- Computes foreground text colors via relative luminance formula
- Scopes brand colors to light mode only; dark mode uses shadcn defaults
- RAG tokens (`--rag-green`, `--rag-amber`, `--rag-red`, `--rag-unscored`) are **only** for compliance/score indicators — NOT for UI chrome (use `--success` / `--destructive` for that)

---

## 12. API Layer

### 12.1 API Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         API LAYER                                 │
│                                                                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ REST v1         │    │ Internal API    │    │ Swagger Docs │ │
│  │ /api/v1/*       │    │ /api/*          │    │ /docs        │ │
│  │                 │    │                 │    │              │ │
│  │ • Vendors CRUD  │    │ • Cron trigger  │    │ CDN-loaded   │ │
│  │ • Audit export  │    │ • Health check  │    │ Swagger UI   │ │
│  │ • Bearer auth   │    │ • File serving  │    │ powered by   │ │
│  │ • IP allowlist  │    │ • Logo serving  │    │ lib/openapi  │ │
│  │ • Rate limited  │    │ • Auth callbacks│    │ .json        │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    SHARED MIDDLEWARE                         │ │
│  │                                                              │ │
│  │  authenticateRequest(request):                                │ │
│  │    → Session auth (NextAuth cookie)                          │ │
│  │    → API key auth (Bearer token, mrk_ prefix)                │ │
│  │    → Returns AuthResult or null                               │ │
│  │                                                              │ │
│  │  runApiHandler(handler):                                      │ │
│  │    → try/catch wrapper                                       │ │
│  │    → Unexpected errors → 500 (no internals leaked)           │ │
│  │    → Logged server-side                                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 12.2 API Error Format

All API errors use a consistent JSON envelope:

```json
{
  "error": {
    "message": "Human-readable error description",
    "status": 400
  }
}
```

Unexpected errors return a generic `{"error":{"message":"Internal error","status":500}}` — never exposing stack traces or internal state.

### 12.3 Endpoint Catalog

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | None | Health check |
| GET | `/api/cron/run` | CRON_SECRET header | Trigger all cron jobs |
| GET | `/api/brand/logo` | None | Serve org logo (cache-busted) |
| GET | `/api/attachments/[id]` | Session / API key | Serve attachment file |
| GET | `/api/docs` | Session or API key (`api:manage`) | Serve OpenAPI spec JSON |
| **Vendors** ||||
| GET | `/api/v1/vendors` | Bearer token | List vendors (`?query=`, `?tier=`) |
| POST | `/api/v1/vendors/import` | Bearer token | Create vendor from JSON |
| GET | `/api/v1/vendors/{id}` | Bearer token | Get vendor detail |
| GET | `/api/v1/vendors/external/{externalId}` | Bearer token | Get vendor by external ID reference |
| PUT | `/api/v1/vendors/{id}` | Bearer token | Update vendor |
| DELETE | `/api/v1/vendors/{id}` | Bearer token | Delete vendor |
| GET | `/api/v1/vendors/{id}/score` | Bearer token | Score summary |
| GET | `/api/v1/vendors/{id}/export` | Bearer token | Export vendor as CSV |
| GET | `/api/v1/vendors/{id}/assessments` | Bearer token | List vendor's assessments |
| GET | `/api/v1/vendors/{id}/certifications` | Bearer token | List vendor's certifications |
| **Assessments** ||||
| GET | `/api/v1/assessments` | Bearer token | List assessments (filters, CSV) |
| GET | `/api/v1/assessments/{id}` | Bearer token | Full assessment detail |
| **Findings** ||||
| GET | `/api/v1/findings` | Bearer token | List findings (filters) |
| PATCH | `/api/v1/findings/{id}` | Bearer token | Update finding status |
| **Frameworks** ||||
| GET | `/api/v1/frameworks` | Bearer token | List frameworks |
| GET | `/api/v1/frameworks/{id}` | Bearer token | Framework detail + controls |
| DELETE | `/api/v1/frameworks/{id}` | Bearer token | Delete framework |
| **Dashboard** ||||
| GET | `/api/v1/dashboard` | Bearer token | Portfolio metrics aggregation |
| GET | `/api/dashboard/report` | Bearer token | Download portfolio PDF report |
| **Audit** ||||
| GET | `/api/v1/audit` | Bearer token | Query audit log (JSON/CSV) |

### 12.4 Swagger/OpenAPI

- Spec file: `lib/openapi.json` (OpenAPI 3.0)
- Swagger UI: CDN-loaded at `/docs` page
- Every endpoint documented with: summary, description, parameter schemas, response schemas, error codes
- Updated with each API change (phase requirement)

---

## 13. Security Architecture

### 13.1 Defense-in-Depth Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                              │
│                                                                  │
│  Layer 1: NETWORK                                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Reverse proxy terminates TLS (Caddy/nginx)             │    │
│  │ • App only listens on localhost:3000                     │    │
│  │ • TRUSTED_PROXY_COUNT env for correct client-IP          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Layer 2: TRANSPORT (proxy.ts)                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Nonce-based strict-dynamic CSP (document GETs only)    │    │
│  │ • X-Frame-Options: DENY                                  │    │
│  │ • X-Content-Type-Options: nosniff                        │    │
│  │ • Referrer-Policy: strict-origin-when-cross-origin       │    │
│  │ • Permissions-Policy: all sensors disabled               │    │
│  │ • No upgrade-insecure-requests (supports HTTP deploys)   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Layer 3: AUTHENTICATION                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Passwords: bcryptjs 12 rounds                           │    │
│  │ • API keys: bcrypt 12 rounds, prefix-indexed             │    │
│  │ • Secrets: AES-256-GCM at rest                            │    │
│  │ • CRON_SECRET: timing-safe comparison                     │    │
│  │ • Session: JWT with HttpOnly + Secure cookies             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Layer 4: AUTHORIZATION                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • RBAC on every page, action, and API route              │    │
│  │ • API key IP allowlisting (CIDR)                         │    │
│  │ • Break-glass token for SSO lockout recovery             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Layer 5: INPUT VALIDATION                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • All external input validated with Zod schemas          │    │
│  │ • File uploads: MIME blocklist, size limits               │    │
│  │ • Path traversal prevention in storage layer             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Layer 6: RATE LIMITING                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • In-memory fixed-window per concern                   │    │
│  │ • Login, portal, password reset, API, break-glass        │    │
│  │ • All limits configurable via Settings                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Layer 7: DATA PROTECTION                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • No secrets returned to client                           │    │
│  │ • Evidence served only via authenticated routes           │    │
│  │ • Soft-delete preserves audit trail (SetNull)            │    │
│  │ • Encryption-at-rest for all stored credentials           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 13.2 Content Security Policy

```
Default CSP (applied to document GETs only):

  script-src  'self'
              'nonce-<random-uuid>'
              'strict-dynamic'
              cdn.jsdelivr.net
              ['unsafe-eval' in dev]

  style-src   'self'
              'unsafe-inline'
              cdn.jsdelivr.net

  img-src     'self'
              data:
              blob:
              cdn.jsdelivr.net

  font-src    'self'
              data:
              cdn.jsdelivr.net

  connect-src 'self'

  object-src  'none'

  base-uri    'self'

  form-action 'self'

  frame-ancestors 'none'

IMPORTANT: CSP is ONLY applied to document GET requests.
  - NOT to Server Action POSTs (would drop action results)
  - NOT to RSC fetches
  - NOT to data/API requests

This is enforced via isDocumentRequest() gate in proxy.ts.
```

### 13.3 Rate Limiting Matrix

| Concern | Default Limit | Configuration Key |
|---|---|---|
| Login attempts | 10 / min | `loginRateLimitPerMin` |
| Portal page loads | 30 / min | `portalPageLoadsPerMin` |
| Portal uploads | 10 / min | `portalUploadsPerMin` |
| Portal submissions | 5 / min | `portalSubmitPerMin` |
| Portal password attempts | 5 / min | `portalPasswordAttemptsPerMin` |
| Password resets | 1 / min | `passwordResetPerMin` |
| Break-glass | 10 / min | `breakGlassPerMin` |
| API key default | 30 / min | `api.defaultRateLimitPerMin` |
| API key (per-key) | Configurable | `rateLimitPerMin` on ApiKey |
| Session timeout | 30 min idle | `sessionTimeoutMinutes` |

### 13.4 Additional Security Headers

```
X-Frame-Options: DENY
  Prevents clickjacking by blocking all framing

Referrer-Policy: strict-origin-when-cross-origin
  Sends referrer only for same-origin; origin-only for HTTPS→HTTP

X-Content-Type-Options: nosniff
  Prevents MIME-type sniffing

Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()
  Disables all browser sensor APIs
```

---

## 14. Cron Jobs & Background Processing

### 14.1 Trigger Mechanism

Scheduled jobs run **inside the app by default**: `instrumentation.ts` starts a scheduler on server boot (`lib/scheduler.ts`) that ticks every five minutes, re-reading the `internalSchedulerEnabled` setting each tick so admins can disable it from Settings → Scheduling without a restart. An in-process lock (`runScheduledJobsOnce()`) ensures the internal tick and the API endpoint never execute jobs concurrently — the second caller receives `409` instead of running a duplicate.

```
┌─────────────────────────────────────────────────────────────────┐
│                      CRON ARCHITECTURE                           │
│                                                                  │
│  Trigger A: internal scheduler (default)                         │
│    instrumentation.ts → lib/scheduler.ts → tick every 5 min      │
│    (skips silently when internalSchedulerEnabled = false)        │
│                                                                  │
│  Trigger B: external scheduler (optional, system cron etc.)      │
│       │                                                          │
│       │  GET /api/cron/run                                       │
│       │  Header: X-Cron-Secret: <CRON_SECRET>                    │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  app/api/cron/run/route.ts + lib/cron/run-jobs.ts           │ │
│  │                                                              │ │
│  │  1. Validate CRON_SECRET via timing-safe comparison          │ │
│  │  2. Acquire in-process run lock (409 if already running)     │ │
│  │  3. Run all jobs sequentially:                               │ │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  JOB 1: Reminders                                          │ │
│  │  ─────────────────                                         │ │
│  │  • For each reminderOffsetDays (default [7, 1]):           │ │
│  │    Find SENT/IN_PROGRESS assessments due on that date      │ │
│  │  • Send reminder email to vendor                           │ │
│  │  • Idempotent: checks for existing SENT REMINDER log       │ │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  JOB 2: Escalations                                        │ │
│  │  ─────────────────                                         │ │
│  │  • Find SENT/IN_PROGRESS overdue > escalationAfterDays     │ │
│  │  • Send escalation email to reviewer                       │ │
│  │  • Idempotent: checks existing ESCALATION log              │ │
│  │  • Sets status to OVERDUE if SENT                           │ │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  JOB 3: Certification/Contract Expiry Notices              │ │
│  │  ─────────────────                                         │ │
│  │  • 30-day and 7-day offsets before expiresDate             │ │
│  │  • Emails vendor's risk owner (staff)                      │ │
│  │  • Idempotent via log key                                  │ │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  JOB 4: Recurring Assessments                               │ │
│  │  ─────────────────                                         │ │
│  │  • Find assessments where nextRunAt <= now                 │ │
│  │  • Clone assessment, send new invitation                   │ │
│  │  • Schedule next run (QUARTERLY → +90d, ANNUAL → +365d)   │ │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  JOB 5: Audit Log Pruning                                   │ │
│  │  ─────────────────                                         │ │
│  │  • Delete AuditLog rows older than audit.retentionDays     │ │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  JOB 6: Email Log Pruning                                   │ │
│  │  ─────────────────                                         │ │
│  │  • Delete NotificationLog rows older than                  │ │
│  │    emailLogRetentionDays (default 14)                      │ │
│  └─────────────────────────────────────────────────────────┘    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  JOB 7: Orphaned File Sweep                                 │ │
│  │  ─────────────────                                         │ │
│  │  • List all stored files via storage.list()                │ │
│  │  • Compare against Evidence.storageKey and logoKey         │ │
│  │  • Delete unreferenced files older than 1 hour             │ │
│  │    (grace period for in-flight uploads)                    │ │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 15. UI Component Architecture

### 15.1 Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                      COMPONENT LAYERS                            │
│                                                                  │
│  LAYER 0: PAGE LAYOUTS                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  app/(internal)/layout.tsx                                │    │
│  │  ┌─────────────────────────────────────────────────────┐ │    │
│  │  │  AppSidebar (nav)  │  Main Content                   │ │    │
│  │  │  ┌─────────────┐   │  ┌───────────────────────────┐ │ │    │
│  │  │  │ UserMenu    │   │  │  PageHeader (breadcrumbs) │ │ │    │
│  │  │  │ ThemeToggle │   │  │  ─────────────────────── │ │ │    │
│  │  │  │ IdleTimer   │   │  │  Page Content             │ │ │    │
│  │  │  │ KbdShortcuts│   │  │  └───────────────────────────┘ │ │    │
│  │  │  └─────────────┘   │                                    │ │    │
│  │  └────────────────────┘                                    │ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  LAYER 1: PRIMITIVES (shadcn/ui)                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Button, Card, Input, Select, Badge, Table,              │    │
│  │  Sheet, Dialog, Tabs, DropdownMenu, Skeleton,            │    │
│  │  Tooltip, Textarea, Checkbox, RadioGroup, Separator,     │    │
│  │  AlertDialog, Chart                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  LAYER 2: DOMAIN COMPOSITES                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  AssessmentTimeline    ScrollToTop                    │ │
│  │  AttachEvidenceButton  AutoSubmitSelect   Breadcrumbs    │ │
│  │  CertificationsMngr    ConfirmDialog      ControlPills   │ │
│  │  ControlMultiSelect    CopyLink           DashboardCharts│ │
│  │  ComplianceRadar                                         │ │
│  │  EmptyState            FlashToast         Pagination     │ │
│  │  ProgressBar           QuestionForm       ReviewPanel    │ │
│  │  ScoreBadge            SearchInput        StatCard       │ │
│  │  TemplatePreview       VendorAttachments  VendorForm     │ │
│  │  ViewToggle            ConditionalRulesE  DuplicateMenu  │ │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  LAYER 3: SHARED UTILITIES                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  sonner.tsx — Sonner <Toaster /> (portal-based)             │ │
│  │  useActionFeedback.tsx — toast + router.refresh()        │ │
│  │  keyboardShortcuts.tsx — g+letter nav, ? help modal      │ │
│  │  idle-timer.tsx — inactivity countdown, auto-sign-out    │ │
│  │  view-preference.ts — cookie-backed row/card toggle      │ │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 15.2 Client vs Server Component Split

```
Server Components (reads, no interactivity):
  • app/(internal)/*/page.tsx — data fetching, auth guards, layout
  • Breadcrumbs, EmptyState
  • Permission gating (hasPermission checks in JSX)

Client Components ("use client" directive):
  • All shadcn/ui primitives (interactivity required)
  • Forms (VendorForm, QuestionForm) — useActionState
  • Charts (recharts) — browser rendering
  • ReviewPanel, CertificationsManager — stateful
  • AttachEvidenceButton, CopyLink — DOM events
  • FlashToast, SearchInput, ViewToggle — user interaction
  • KeyboardShortcuts, IdleTimer — browser APIs

Server Components CANNOT:
  • Pass onClick, onChange, etc. to Client Components
  → Extract into standalone client wrappers (e.g., DuplicateTemplateMenuItem)
```

### 15.3 Toast Notification System

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOAST SYSTEM                                   │
│                                                                  │
│  Architecture: Sonner (shadcn/ui wrapper) via                    │
│  components/ui/sonner.tsx — portal-based rendering into          │
│  document.body, survives Next.js route refreshes.                │
│                                                                  │
│  Components:                                                     │
│    <Toaster /> — renders icons for success/error/info/warning    │
│    toast.success() / toast.error() / toast() — imperative API    │
│                                                                  │
│  Usage:                                                          │
│    Server Action → redirect → FlashToast component               │
│    Client Action → useActionFeedback hook                         │
│      → toast.success(message) / toast.error(message)             │
│      → router.refresh() (guarded, not revalidatePath)            │
│                                                                  │
│  Anti-pattern (prod drops state):                                │
│    Server Action → revalidatePath(currentRoute) → state lost     │
│    Fixed by returning state + useActionFeedback(pattern)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 16. Deployment Architecture

### 16.1 Docker Compose Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                    docker-compose.yml                             │
│                                                                  │
│  ┌────────────────────┐    ┌────────────────────┐               │
│  │   app (Next.js)    │    │   db (PostgreSQL)  │               │
│  │────────────────────│    │────────────────────│               │
│  │  image: node:22-slim│    │  image: postgres:17│               │
│  │  port: 3000        │    │  port: 5432        │               │
│  │  env:              │    │  env:              │               │
│  │    DATABASE_URL    │───▶│    POSTGRES_USER   │               │
│  │    AUTH_SECRET     │    │    POSTGRES_PASSWORD│              │
│  │    APP_ENCRYPTION  │    │    POSTGRES_DB     │               │
│  │    CRON_SECRET     │    └────────────────────┘               │
│  │    APP_URL         │                                          │
│  │  volumes:          │    ┌────────────────────┐               │
│  │    ./.storage      │    │  Reverse Proxy     │               │
│  └────────────────────┘    │  (Caddy/nginx)     │               │
│                            │  TLS termination   │               │
│                            │  → proxy to :3000  │               │
│                            └────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### 16.2 Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Always | PostgreSQL connection string (Prisma format) |
| `AUTH_SECRET` | Always | NextAuth JWT signing secret |
| `APP_ENCRYPTION_KEY` | Always | Secret encryption key (min 32 chars) |
| `CRON_SECRET` | Production | Cron endpoint auth token |
| `APP_URL` | Always | Canonical app URL (for email links) |
| `TRUSTED_PROXY_COUNT` | Proxy behind | Number of trusted reverse proxy hops (default 0) |
| `CLIENT_IP_HEADER` | Custom proxy | Override X-Forwarded-For header name |
| `EVIDENCE_STORAGE_PATH` | Optional | Local file storage root (default: `./.storage/evidence`) |
| `TEST_DATABASE_URL` | Testing | Separate DB for test suite (name must contain "test") |

### 16.3 Boot Sequence

```
1. Docker Compose starts PostgreSQL container
2. PostgreSQL health check passes
3. Next.js container starts
4. On first boot:
   a. Prisma migrations apply (prisma migrate deploy)
   b. Seed script runs (prisma db seed)
      → Seeds system roles (Admin, Reviewer, Viewer)
      → Seeds default settings
      → Seeds ISO 27001, SOC 2, NIST CSF, Essential Eight frameworks
      → Seeds starter + full out-of-the-box questionnaire templates (one per framework)
5. App listens on port 3000
6. Reverse proxy starts, obtains TLS cert, proxies to :3000
```

> The first Admin user is created via the `/setup` page on first browser visit,
> not by the seed script. The `/setup` page is only available when zero users exist.

---

## 17. Data Lifecycle

### 17.1 Create Flows

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  VENDOR  │    │ TEMPLATE │    │ ASSESSMT │
│          │    │          │    │          │
│ Name     │    │ Name     │    │ Vendor   │
│ Contact  │    │ Sections │    │ Template │
│ Tier     │    │   ├─ Q1  │    │ Snapshot │
│ Owner    │    │   ├─ Q2  │    │ Token    │
│ Notes    │    │   └─ Q3  │    │ Status   │
│ Attach.  │    │ Status   │    │ Due date │
└──────────┘    └──────────┘    └──────────┘

┌──────────┐    ┌──────────┐    ┌──────────┐
│FRAMEWORK│    │   USER   │    │ API KEY  │
│          │    │          │    │          │
│ Name     │    │ Email    │    │ Name     │
│ Version  │    │ Name     │    │ Key (mrk)│
│ Controls │    │ Password │    │ Expiry   │
│          │    │ Role     │    │ IP list  │
│          │    │          │    │ Rate lim │
└──────────┘    └──────────┘    └──────────┘
```

### 17.2 Delete Cascades

```
Delete Vendor
  ├── Cascade: All Assessments
  │     ├── Cascade: All AssessmentQuestions
  │     │     ├── Cascade: All Responses
  │     │     │     ├── Cascade: All AnswerReviews
  │     │     │     └── SetNull: Findings (responseId)
  │     │     └── SetNull: Evidence (assessmentQuestionId)
  │     ├── Cascade: All Comments
  │     ├── Cascade: All Evidence (assessmentId)
  │     ├── Cascade: All Findings (assessmentId)
  │     └── Cascade: All NotificationLogs
  ├── Cascade: All VendorCertifications
  ├── Cascade: All CustomerResponsibilityActions
  ├── Explicit: All Attachment DB rows + storage files (Vendor +
  │     VendorCertification scope) deleted before Prisma cascade
  └── Explicit: All Evidence + Attachment storage files deleted
       before Prisma cascade

Delete User
  └── SetNull: Assessments (reviewerId)
  └── SetNull: Vendors (ownerId)
  └── SetNull: AnswerReviews (reviewerId)
  └── SetNull: Findings (resolvedById)
  └── SetNull: NotificationLogs (sentById)
  └── Cascade: AuditLogs (userId)
  └── Cascade: SsoIdentities
  └── Cascade: ApiKeys
  └── Cascade: PasswordResetTokens
```

### 17.3 Audit Trail

Every significant action is recorded:

```
AuditLog
├── LOGIN / LOGOUT
├── USER_CREATED / USER_UPDATED / USER_DELETED
├── ROLE_CREATED / ROLE_UPDATED / ROLE_DELETED
├── VENDOR_CREATED / VENDOR_UPDATED / VENDOR_DELETED
├── ASSESSMENT_CREATED / ASSESSMENT_SENT / ASSESSMENT_SUBMITTED
├── ASSESSMENT_REVIEWED / ASSESSMENT_COMPLETED / ASSESSMENT_DELETED
├── TEMPLATE_CREATED / TEMPLATE_UPDATED / TEMPLATE_DELETED
├── FRAMEWORK_CREATED / FRAMEWORK_UPDATED / FRAMEWORK_DELETED
├── API_KEY_CREATED / API_KEY_DELETED
├── SETTING_UPDATED
├── CERTIFICATION_CREATED / CERTIFICATION_UPDATED / CERTIFICATION_DELETED
├── ATTACHMENT_UPLOADED / ATTACHMENT_DELETED
└── FINDING_UPDATED (status changes)
```

- Entity names shown as clickable links (batch-resolved across 9 entity types)
- `meta` JSON field stores contextual data (review decisions, role changes, notes)
- Pruneable via `audit.retentionDays` setting

---

## 18. Compliance Mapping

### 18.1 Framework Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLIANCE MAPPING                             │
│                                                                  │
│  Templates                            Frameworks                 │
│  ─────────                            ──────────                 │
│  ┌──────────┐                         ┌──────────────┐          │
│  │Question 1│──┐                      │  ISO 27001   │          │
│  │──────────│  │    ┌───────────┐     │──────────────│          │
│  │ Q: "Do   │  │    │QstnControl│     │ A.5.1.1      │          │
│  │ you have │  ├───▶│───────────│◀────│ Information   │          │
│  │ a BCP?"  │  │    │questionId │     │ security      │          │
│  └──────────┘  │    │controlId  │     │ policies      │          │
│                │    └───────────┘     └──────────────┘          │
│  ┌──────────┐  │                                                 │
│  │Question 2│──┤    ┌───────────┐     ┌──────────────┐          │
│  │──────────│  │    │QstnControl│     │   SOC 2      │          │
│  │ Q: "How  │  │    │───────────│◀────│──────────────│          │
│  │ do you   │  ├───▶│questionId │     │ CC6.1        │          │
│  │ encrypt  │  │    │controlId  │     │ Logical and  │          │
│  │ data?"   │  │    └───────────┘     │ physical      │          │
│  └──────────┘  │                      │ access        │          │
│                │                      └──────────────┘          │
│  ┌──────────┐  │                                                 │
│  │Question 3│──┤    ┌───────────┐     ┌──────────────┐          │
│  │──────────│  │    │QstnControl│     │  NIST CSF    │          │
│  │ Q: "Do   │  │    │───────────│◀────│──────────────│          │
│  │ you test │  └───▶│questionId │     │ PR.IP-4      │          │
│  │ backups?"│       │controlId  │     │ Backups       │          │
│  └──────────┘       └───────────┘     └──────────────┘          │
│                                                                  │
│  One question can map to multiple controls across frameworks.    │
│  Scoring detects non-compliant answers → findings tagged with    │
│  the violated control codes.                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 18.2 Seeded Frameworks

| Framework | Version | Controls | Source |
|---|---|---|---|
| **ISO 27001:2022** | 2022 | Annex A controls | `prisma/seed-data/` |
| **SOC 2** | 2020 | Trust Services Criteria (TSC) | `prisma/seed-data/` |
| **NIST CSF** | 2.0 | Framework Core (Govern, Identify, Protect, Detect, Respond, Recover) | `prisma/seed-data/` |
| **Essential Eight** | 2023 | Maturity Model (Levels 0-3) | `prisma/seed-data/` |

Each framework also ships a complete, published questionnaire template — one auto-scored question per control — in `prisma/seed-data/templates/`, alongside the shorter starter templates.

### 18.3 Findings & Control Mapping

When a vendor answer is non-compliant:

1. The response's mapped control codes are attached to the auto-generated Finding
2. Risk Register shows findings grouped by control code across all vendors
3. "Top Deficient Controls" on the dashboard ranks controls by finding frequency

---

## 19. Key Design Decisions

### 19.1 Why Next.js App Router (not Pages Router)?

- **Server Components for reads:** Dashboard queries, vendor lists, framework catalogs — all run on server, zero JS shipped to browser
- **Server Actions for writes:** Direct function calls from form submits, no API boilerplate, CSRF protection built-in
- **Colocation:** Page, layout, loading, error files in same directory
- **Streaming:** Suspense boundaries for progressive rendering

### 19.2 Why PostgreSQL (not SQLite)?

- **Concurrent writes:** Multiple staff users + vendor portal submissions
- **Transactions:** Scoring reconciliation, framework import, template duplication all wrapped in `prisma.$transaction()`
- **JSON columns:** `AppSetting.value`, `Question.options`, `Question.conditionalLogic`, `Response.value`, `AuditLog.meta`
- **Array columns:** `Role.permissions[]`, `AssessmentQuestion.controlIds[]`, `Finding.controlCodes[]`

### 19.3 Why Prisma (not raw SQL)?

- **Type safety:** Full TypeScript types for all queries, migrations are typed
- **ERD generation:** Schema-as-source-of-truth
- **Migrations:** Versioned, repeatable, apply-on-deploy
- **N+1 prevention:** `include` and `select` for eager loading

### 19.4 Why Token-Based Portal (not Vendor Accounts)?

- **No registration:** Vendors click a link and answer — no password to forget
- **Security:** 43-char token = 2^256 search space, expiry enforced, optional password
- **Simplicity:** One link = one assessment; no vendor-user management needed
- **Flexibility:** Portal can be sent to any email, token can be revoked

### 19.5 Why DB-Backed Settings (not .env files)?

- **Operational agility:** Change SMTP, scoring weights, RAG thresholds without restart
- **Multi-tenancy ready:** Per-org settings in interest
- **Encrypted secrets:** SMTP password, SSO secrets, cloud storage credentials — encrypted at rest
- **Versioned:** Settings changes are auditable (AuditLog)

### 19.6 Why CSP Nonce with Strict-Dynamic (not hash-based)?

- **Inline scripts from React/Next.js:** Unpredictable, nonce is the only viable approach
- **strict-dynamic:** Allows scripts loaded by allowed scripts (including Next.js bundles)
- **No 'unsafe-inline' in script-src:** Defeats XSS
- **Document-only application:** Prevents breaking Server Action POST body parsing

### 19.7 Why Files Are Copied, Not Symlinked?

- **Attachment independence:** Deleting the assessment that generated evidence does not orphan the vendor's attachment
- **Provider portability:** Source and destination can be on different storage backends
- **Immutability:** Each copy is an independent file with its own lifecycle

### 19.8 Why bcryptjs (not bcrypt)?

- **Pure JavaScript:** No native compilation, works on all platforms
- **12 rounds:** Appropriate for the threat model (small business, internal tool)
- **Timing-safe:** Constant-time comparison built-in

### 19.9 Why In-Memory Rate Limiting (not Redis)?

- **Single-container deployment:** No horizontal scaling in target architecture
- **Simplicity:** No additional infrastructure dependency
- **Configurable:** All limits adjustable via Settings UI

### 19.10 Why Inline In-Process Storage Fingerprint (not Watchdog)?

- **Settings changes rare:** Storage provider changes maybe once in lifetime
- **Lazy re-resolution:** Next request picks up new provider automatically
- **No background thread:** Simpler, no polling overhead

---

## Appendices

### A. File Map

```
app/                          Next.js App Router
  (internal)/                 Authenticated dashboard
    dashboard/                Main dashboard with charts
    vendors/                  Vendor list + detail + edit + compare
      import/                 CSV bulk vendor import
    assessments/              Assessment creation, list, detail
    templates/                Template list + builder
      import/                 JSON template import
    frameworks/               Framework list + detail
      import/                 CSV framework import
    risk-register/            Cross-vendor findings view
    settings/                 All settings tabs
  (auth)/                     Login, first-run setup
  portal/[token]/             Vendor questionnaire (public)
  api/                        Route handlers
    v1/vendors/               REST v1 vendor endpoints
    v1/audit/                 REST v1 audit endpoints
    attachments/[id]/         Auth-gated file serving
    brand/logo/               Org logo serving
    cron/run/                 Cron trigger
    docs/                     OpenAPI spec serving
  docs/                       Swagger UI page

components/                   React components
  ui/                         shadcn/ui primitives (15+)
  *.tsx                       Domain composites (25+)

lib/                          Business logic
  actions/                    Server Actions (13 files)
  db/                         Data access layer (17+ files)
  email/                      Nodemailer + React Email
  schemas/                    Zod validation schemas
  settings/                   DB-backed configuration
  storage/                    File storage provider (local/S3/Azure)
    orphan-sweep.ts           Orphan file classification (pure, unit-tested)
  auth.ts                     NextAuth v5 config + guards
  permissions.ts              RBAC catalog + helpers
  scoring.ts                  Auto-scoring algorithm
  portal.ts                   Conditional question engine
  tokens.ts                   Opaque portal tokens
  api-keys.ts                 API key generation
  api-auth.ts                 Unified authentication
  api-response.ts             API error handling
  rate-limit.ts               Fixed-window rate limiter
  crypto.ts                   AES-256-GCM encryption
  timing-safe.ts              Constant-time comparison
  client-ip.ts                Proxy-aware IP resolution
  break-glass.ts              SSO bypass tokens
  dashboard-insights.ts       Risk aggregation helpers
  pdf-report.tsx              @react-pdf/renderer report
  framework-report.tsx        @react-pdf/renderer framework compliance report
  portfolio-report.tsx        @react-pdf/renderer portfolio report
  nav.ts                      ?back= / ?tab= navigation-state helpers
  radar-labels.ts             Short axis labels for compliance radar
  openapi.json                OpenAPI 3.0 specification
  theme-tokens.tsx            CSS variable injection
  utils.ts                    cn(), formatDate(), etc.

prisma/                       Database
  schema.prisma               Full data model (25 tables)
  migrations/                 Versioned migrations
  seed.ts                     Idempotent seed script
  seed-data/                  Framework seed data + full questionnaire templates

e2e/                          Playwright end-to-end tests
docs/                         VitePress user documentation site (GitHub Pages)
STORAGE.md                    Cloud storage setup guide
APPSECURITY.md                Security hardening
ARCHITECTURE.md               This document
```

### B. Port & Protocol Summary

| Service | Port | Protocol | Notes |
|---|---|---|---|
| Next.js App | 3000 | HTTP | Internal only, behind proxy |
| PostgreSQL | 5432 | TCP | Internal Docker network |
| Reverse Proxy | 443 | HTTPS | Public TLS termination |
| SMTP Relay | 587 | TLS | Outbound only |

### C. Glossary

| Term | Definition |
|---|---|
| **Assessment** | A questionnaire sent to a vendor to evaluate risk posture |
| **Control** | A specific compliance requirement (e.g., ISO 27001 A.5.1.1) mapped to questions |
| **Finding** | A non-compliant or at-risk item identified during assessment |
| **Framework** | A compliance standard (ISO 27001, SOC 2, NIST CSF, Essential Eight) |
| **Portal** | The public, token-based vendor questionnaire interface |
| **RAG** | Red-Amber-Green scoring classification for risk visualization |
| **RBAC** | Role-Based Access Control — permission-based authorization |
| **Template** | A reusable questionnaire blueprint with sections and questions |
| **Token** | An opaque, expiring URL slug granting a vendor access to one assessment |
| **Vendor** | A third-party organization being assessed for risk |
