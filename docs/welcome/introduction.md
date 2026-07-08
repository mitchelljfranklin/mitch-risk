# Introduction

## What is Mitch‑Risk?

Mitch‑Risk is a lightweight, self-hosted third party vendor risk management solution. It helps organisations build security questionnaires, send them to vendors via no-login secure portal links, auto-score responses, map answers to compliance frameworks (ISO 27001, SOC 2, NIST CSF, Essential Eight), surface gaps as findings, and track each vendor's risk profile over time.

Designed with simplicity at its core, Mitch‑Risk favours fewer, well-connected screens over sprawling configuration. Everything — email delivery, scoring weights, user roles, storage backends, and the rest — is managed through an intuitive in-app interface. No YAML config files, no Kubernetes manifests, no professional services engagement.

Deploy via Docker Compose behind a reverse proxy and you're running in minutes. A REST API with API key authentication supports integrations, and a Swagger UI provides interactive documentation for citizen developers and SIEMs.

## Why Mitch‑Risk exists

The third party vendor risk management market is well-served by mature SaaS platforms — UpGuard, OneTrust, Vanta, and others offer deep feature sets, global threat intelligence, and enterprise compliance automation. These are excellent products built by talented teams, and for large organisations with dedicated security operations teams, they deliver tremendous value.

But that value comes at a cost — and not just the subscription. The onboarding process often involves custom integrations, hours of configuration, and a learning curve that assumes you already know what a SOC 2 Type II report looks like. For a small IT team managing the technology needs of an aged care provider, a not-for-profit, a local manufacturer, or a growing startup, that overhead is the real barrier — not the feature list.

Mitch‑Risk aims to bridge that gap. It strips third party vendor risk management down to its essentials: build a questionnaire, send it, score the answers, track compliance over time. No AI risk scoring, no vendor universe crawling, no board reporting module you will never open. Just the core workflow, done well, deployable anywhere.

## What Mitch‑Risk is not

Mitch‑Risk does not aim to replace enterprise VRM platforms, nor does it claim feature parity with products whose engineering teams outsize our entire user base. If your organisation needs continuous vendor monitoring across thousands of suppliers, automated security ratings, or risk quantification against financial exposure models, there are purpose-built SaaS platforms that serve that market better than we ever could.

Mitch‑Risk is for everyone else — the teams who know they need a structured approach to vendor risk but do not need a solution that costs more than the vendor relationship itself. It is open-source, self-hosted, and designed to be managed by a single person alongside their other responsibilities.

If that sounds like your reality, you are in the right place.
