# Compliance Coverage

mitch-risk maps assessment questions to compliance framework controls, enabling organisations to demonstrate vendor due diligence against industry standards. This page details what's covered and how the mapping works.

## Frameworks Included

Four frameworks are seeded at installation — no manual setup required.

| Framework | Version | Controls | Category |
|---|---|---|---|
| **ISO 27001** | 2022 | 93 Annex A controls | Information security management |
| **SOC 2** | 2020 | 51 Trust Services Criteria | Service organisation controls |
| **NIST CSF** | 2.0 | 129 subcategories (6 functions) | Cybersecurity framework |
| **Essential Eight** | 2023 | 55 controls (8 strategies, 3 maturity levels) | Australian Signals Directorate |

Additional frameworks can be imported via CSV under **Frameworks → Import**. The CSV template includes fields for domain, control code, title, and guidance — mapping any compliance standard.

## How Control Mapping Works

```
┌────────────┐     ┌───────────┐     ┌──────────────┐
│  Question  │────▶│ Question  │◀────│   Control     │
│  (in       │     │ Control   │     │   (in         │
│  template) │     │ (join)    │     │   framework)  │
└────────────┘     └───────────┘     └──────────────┘
```

Each question in a template can link to **multiple controls** across **multiple frameworks** simultaneously. When a vendor answers non-compliantly, the finding is tagged with all mapped control codes.

Example: A single question "Do you encrypt data at rest?" might map to:
- **ISO 27001** A.8.24 — Use of cryptography
- **SOC 2** CC6.1 — Logical and physical access controls
- **NIST CSF** PR.DS-1 — Data-at-rest protection
- **Essential Eight** — Maturity Level 2 (encryption strategy)

## ISO 27001:2022 — Sample Control Coverage

All 93 Annex A controls from the 2022 revision are loaded. Below is a representative sample of controls commonly mapped to vendor assessment questions:

| Control | Title | Typical Question Topics |
|---|---|---|
| A.5.1 | Policies for information security | Security policy existence, review frequency, management approval |
| A.5.5 | Contact with authorities | Incident reporting procedures, regulatory contacts |
| A.5.7 | Threat intelligence | Threat monitoring, intelligence sources, feed integration |
| A.5.8 | Information security in project management | SDLC security gates, security requirements in projects |
| A.5.14 | Information transfer | Secure file transfer, email encryption, data exchange policies |
| A.5.17 | Authentication information | MFA, password policies, key management, credential rotation |
| A.5.24 | Information security incident management | Incident response plan, escalation procedures, post-mortem |
| A.5.29 | Information security during disruption | Business continuity plan, DR site, DR testing frequency |
| A.5.30 | ICT readiness for business continuity | RTO/RPO, backup testing, failover procedures |
| A.6.3 | Information security awareness and training | Security training program, phishing simulations, training frequency |
| A.7.2 | Physical entry | Physical access controls, badge systems, visitor management |
| A.7.4 | Physical security monitoring | CCTV, alarm systems, 24/7 monitoring |
| A.8.1 | User endpoint devices | MDM, endpoint encryption, device policies |
| A.8.3 | Information access restriction | RBAC, least privilege, access review cadence |
| A.8.5 | Secure authentication | SSO, MFA, passwordless, session management |
| A.8.7 | Protection against malware | Antivirus, EDR, malware detection, response procedures |
| A.8.8 | Management of technical vulnerabilities | Patching SLA, vulnerability scanning, CVE tracking |
| A.8.11 | Data masking | PII masking, test data anonymisation |
| A.8.12 | Data leakage prevention | DLP tools, data classification, egress monitoring |
| A.8.16 | Monitoring activities | Log aggregation, SIEM, alert thresholds |
| A.8.24 | Use of cryptography | Encryption at rest, encryption in transit, key management, algorithm selection |

## SOC 2 — Trust Services Criteria Coverage

All 51 TSC points map from the 2020 edition. Sample coverage of the five trust service criteria categories:

| Category | Mapped Controls | Focus |
|---|---|---|
| **Security** (CC6.x) | CC6.1–CC6.8 | Logical access, authentication, monitoring, firewall, malware, vulnerability management |
| **Availability** (CC7.x) | CC7.1–CC7.5 | Capacity management, backup and recovery, incident response |
| **Confidentiality** (CC8.x) | CC8.1 | Data classification, encryption, disposal |
| **Processing Integrity** (CC9.x) | CC9.1–CC9.2 | Data processing accuracy, quality assurance |
| **Privacy** (CC10.x) | CC10.1–CC10.3 | PII handling, consent management, data subject rights |

## NIST CSF 2.0 — Function Coverage

All 129 subcategories across 6 functions (Govern, Identify, Protect, Detect, Respond, Recover) are seeded:

| Function | Subcategories | Key Controls Mapped |
|---|---|---|
| **Govern (GV)** | 6 | Security policy, risk appetite, roles and responsibilities, supply chain oversight |
| **Identify (ID)** | 7 | Asset management, risk assessment, vulnerability identification, business environment |
| **Protect (PR)** | 14 | Access control, awareness training, data security, maintenance, protective technology |
| **Detect (DE)** | 5 | Anomalies and events, continuous monitoring, detection processes |
| **Respond (RS)** | 5 | Response planning, communications, analysis, mitigation, improvements |
| **Recover (RC)** | 5 | Recovery planning, improvements, communications |

## Essential Eight — Strategy Coverage

All 55 controls across 8 mitigation strategies with Maturity Levels 0–3:

| Strategy | Purpose | Maturity Levels Assessed |
|---|---|---|
| Application control | Prevent unapproved/malicious programs | 0–3 |
| Patch applications | Close known vulnerabilities in apps | 0–3 |
| Configure Microsoft Office macros | Block macros from the internet | 0–3 |
| User application hardening | Block Flash, ads, Java on the internet | 0–3 |
| Restrict administrative privileges | Limit powerful accounts | 0–3 |
| Patch operating systems | Close known OS vulnerabilities | 0–3 |
| Multi-factor authentication | Protect against credential theft | 0–3 |
| Regular backups | Ensure data recovery | 0–3 |

## Custom Frameworks

Any compliance framework can be added via CSV import at **Frameworks → Import**. The CSV format is:

```csv
domain,code,title,guidance
A,5.1,Policies for information security,Information security policy and topic-specific policies shall be defined...
A,5.2,Information security roles and responsibilities,Information security roles and responsibilities shall be defined...
```

The import runs in a single database transaction — either all controls are created or none are.

## Coverage Limitations

- **Mapping is template-driven** — question-to-control links must be configured by the admin building templates. The platform doesn't auto-suggest or auto-map
- **Assessment coverage depends on template quality** — if a template doesn't ask about a control, that control won't be assessed
- **Manual review is the primary mechanism** — unscorable question types (Free Text, File Upload) require reviewer judgment; the platform auto-scores only structured types (Yes/No, Multiple Choice, Numeric, etc.)
- **No framework gap analysis** — the platform doesn't report which controls have no questions mapped to them. This is left to the admin's template design process
