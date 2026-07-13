---
layout: home

hero:
  name: "Mitch‑Risk"
  text: "Lightweight third party vendor risk management"
  tagline: Build security questionnaires with conditional logic, send them via no-login secure portal links, auto-score responses with configurable RAG thresholds, and map answers to ISO 27001, SOC 2, NIST CSF, and Essential Eight.
  image:
    src: /favicon.svg
    alt: Mitch‑Risk
  actions:
    - theme: brand
      text: Get Started
      link: ./welcome/introduction
    - theme: alt
      text: View on GitHub
      link: https://github.com/mitchelljfranklin/mitch-risk

features:
  - title: Questionnaire Builder
    details: 12 question types with conditional logic — show or hide questions based on previous answers.
  - title: Secure Vendor Portal
    details: No-login, opaque token links. Optional password gate. Auto-save progress so vendors never lose work.
  - title: Weighted RAG Scoring
    details: Configurable risk weights and thresholds. Auto-score every response, generate findings from gaps.
  - title: Compliance Mapping
    details: Map questions to ISO 27001:2022, SOC 2, NIST CSF 2.0, and Essential Eight controls. Track coverage across frameworks.
  - title: Vendor Profiles
    details: Tier, data sensitivity, risk owner, certifications, evidence attachments. Track risk posture over time with trend charts.
  - title: REST API
    details: Session + API key auth with Bearer tokens, IP allowlisting, and configurable expiry. Interactive Swagger UI at /docs on any running instance.
  - title: Role-Based Access Control
    details: Three system roles (Admin, Reviewer, Viewer) plus custom roles with 23 fine-grained resource:action permissions.
  - title: Self-Hosted
    details: Docker Compose behind any reverse proxy. Local disk or cloud storage (S3, Azure Blob). Runs anywhere.
---
