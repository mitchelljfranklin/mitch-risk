# Software Bill of Materials (SBOM)

This document lists every direct software dependency used by Mitch‑Risk v1.2.0, organised by functional purpose. It is intended for security reviewers, compliance assessors, and procurement teams evaluating the platform for organisational use.

## Runtime Requirements

| Component | Minimum Version | Notes |
|-----------|----------------|-------|
| Node.js | 22 | JavaScript runtime (LTS) |
| PostgreSQL | 17 | Relational database server |
| Docker (optional) | 24+ | Container runtime for self-hosted deployment |

## Runtime Dependencies

### Framework & Runtime

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| [next](https://npmjs.com/package/next) | 16.2.10 | MIT | Full-stack React framework (App Router, Server Components, Server Actions) |
| [react](https://npmjs.com/package/react) | 19.2.7 | MIT | UI library |
| [react-dom](https://npmjs.com/package/react-dom) | 19.2.7 | MIT | React DOM renderer |

### Database & ORM

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| [prisma](https://npmjs.com/package/prisma) | 7.8.0 | Apache-2.0 | Type-safe ORM — schema management, migrations, query engine |
| [@prisma/client](https://npmjs.com/package/@prisma/client) | 7.8.0 | Apache-2.0 | Generated Prisma client for type-safe database access |
| [@prisma/adapter-pg](https://npmjs.com/package/@prisma/adapter-pg) | 7.8.0 | Apache-2.0 | Driver adapter connecting Prisma to PostgreSQL via node-postgres |
| [pg](https://npmjs.com/package/pg) | 8.22.0 | MIT | PostgreSQL client library used by the Prisma driver adapter |

### Authentication & Security

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| [next-auth](https://npmjs.com/package/next-auth) | 5.0.0-beta.31 | ISC | Authentication framework — session management, SSO (OIDC), credentials |
| [bcryptjs](https://npmjs.com/package/bcryptjs) | 3.0.3 | BSD-3-Clause | Password hashing (12 rounds) and API key verification |
| [zod](https://npmjs.com/package/zod) | 4.4.3 | MIT | Schema validation for all external input (forms, API bodies, imports) |

### UI Components & Styling

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| [radix-ui](https://npmjs.com/package/radix-ui) | 1.6.2 | MIT | Unstyled accessible UI primitives (dialogs, selects, tabs, tooltips) |
| [@radix-ui/react-alert-dialog](https://npmjs.com/package/@radix-ui/react-alert-dialog) | 1.1.19 | MIT | Confirmation dialog primitive |
| [@radix-ui/react-slot](https://npmjs.com/package/@radix-ui/react-slot) | 1.3.0 | MIT | Component composition utility (asChild pattern) |
| [tailwindcss](https://npmjs.com/package/tailwindcss) | 4.x | MIT | Utility-first CSS framework (dev dependency, compiled at build time) |
| [tailwind-merge](https://npmjs.com/package/tailwind-merge) | 3.6.0 | MIT | Resolves Tailwind class conflicts |
| [class-variance-authority](https://npmjs.com/package/class-variance-authority) | 0.7.1 | Apache-2.0 | Component variant management (cva pattern) |
| [clsx](https://npmjs.com/package/clsx) | 2.1.1 | MIT | Conditional class name builder |
| [tw-animate-css](https://npmjs.com/package/tw-animate-css) | 1.4.0 | MIT | Animation utilities for Tailwind |
| [lucide-react](https://npmjs.com/package/lucide-react) | 1.24.0 | ISC | Icon library |
| [sonner](https://npmjs.com/package/sonner) | 2.0.7 | MIT | Toast notification system |
| [cmdk](https://npmjs.com/package/cmdk) | 1.1.1 | MIT | Command palette / combobox primitive |
| [next-themes](https://npmjs.com/package/next-themes) | 0.4.6 | MIT | Light/dark theme switching |

### Data Display & Charts

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| [recharts](https://npmjs.com/package/recharts) | 3.9.2 | MIT | Radar charts and bar charts on the dashboard |
| [@tanstack/react-table](https://npmjs.com/package/@tanstack/react-table) | 8.21.3 | MIT | Sortable, filterable table primitives |

### Rich Text & Markdown

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| [react-markdown](https://npmjs.com/package/react-markdown) | 10.1.0 | MIT | Renders Markdown help text in the vendor portal |
| [@uiw/react-md-editor](https://npmjs.com/package/@uiw/react-md-editor) | 4.1.1 | MIT | WYSIWYG Markdown editor for question help text (template builder) |
| [marked](https://npmjs.com/package/marked) | 18.0.6 | MIT | Markdown parser used server-side |
| [@tailwindcss/typography](https://npmjs.com/package/@tailwindcss/typography) | 0.5.20 | MIT | Typography presets for rendered Markdown |

### Email

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| [nodemailer](https://npmjs.com/package/nodemailer) | 9.0.3 | MIT-0 | SMTP email delivery (invites, reminders, escalations) |
| [@react-email/components](https://npmjs.com/package/@react-email/components) | 1.0.12 | MIT | React components for email template rendering |

### File Storage

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| [@aws-sdk/client-s3](https://npmjs.com/package/@aws-sdk/client-s3) | 3.1086.0 | Apache-2.0 | S3-compatible file storage (evidence, attachments) |
| [@azure/storage-blob](https://npmjs.com/package/@azure/storage-blob) | 12.33.0 | MIT | Azure Blob Storage alternative for file storage |

### Document Generation

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| [@react-pdf/renderer](https://npmjs.com/package/@react-pdf/renderer) | 4.5.1 | MIT | Server-side PDF generation (assessment and framework compliance reports) |

### Utilities

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| [dotenv](https://npmjs.com/package/dotenv) | 17.4.2 | BSD-2-Clause | Environment variable loading |
| [tsx](https://npmjs.com/package/tsx) | 4.23.1 | MIT | TypeScript execution for seed scripts |

## Build & Development Dependencies

These packages are used during development and CI only — they are not included in the production Docker image.

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| [typescript](https://npmjs.com/package/typescript) | 6.x | Apache-2.0 | Static type checking |
| [eslint](https://npmjs.com/package/eslint) | 9.x | MIT | Code quality linting |
| [eslint-config-next](https://npmjs.com/package/eslint-config-next) | 16.2.10 | MIT | Next.js-specific lint rules |
| [prettier](https://npmjs.com/package/prettier) | 3.x | MIT | Code formatting |
| [prettier-plugin-tailwindcss](https://npmjs.com/package/prettier-plugin-tailwindcss) | 0.8.0 | MIT | Tailwind class sorting |
| [tailwindcss](https://npmjs.com/package/tailwindcss) | 4.x | MIT | CSS framework (compiled at build) |
| [@tailwindcss/postcss](https://npmjs.com/package/@tailwindcss/postcss) | 4.x | MIT | PostCSS integration for Tailwind |
| [vitest](https://npmjs.com/package/vitest) | 4.x | MIT | Unit and integration test framework |
| [@playwright/test](https://npmjs.com/package/@playwright/test) | 1.x | Apache-2.0 | End-to-end browser testing |
| [vitepress](https://npmjs.com/package/vitepress) | 1.x | MIT | Documentation site generator |
| [vite-tsconfig-paths](https://npmjs.com/package/vite-tsconfig-paths) | 6.x | MIT | Path alias resolution for tests |
| [@types/node](https://npmjs.com/package/@types/node) | 22.x | MIT | Node.js type definitions |
| [@types/react](https://npmjs.com/package/@types/react) | 19.x | MIT | React type definitions |
| [@types/react-dom](https://npmjs.com/package/@types/react-dom) | 19.x | MIT | React DOM type definitions |
| [@types/nodemailer](https://npmjs.com/package/@types/nodemailer) | 8.x | MIT | Nodemailer type definitions |

## License Summary

| License | Count | Dependencies |
|---------|-------|--------------|
| MIT | 38 | Next.js, React, Radix UI, Tailwind, Recharts, Nodemailer, pg, Zod, and most others |
| Apache-2.0 | 6 | Prisma (3 packages), AWS S3 SDK, TypeScript, class-variance-authority |
| BSD-3-Clause | 1 | bcryptjs |
| BSD-2-Clause | 1 | dotenv |
| ISC | 2 | NextAuth, Lucide React |
| MIT-0 | 1 | Nodemailer |

All dependencies use permissive open-source licenses (MIT, Apache-2.0, BSD, ISC, MIT-0). No copyleft-licensed dependencies (GPL, AGPL, LGPL) are present in the dependency tree. Mitch‑Risk itself is licensed under AGPL-3.0.

## Regenerating

To produce a current dependency listing:

```bash
npm ls --production --depth=0
npm ls --all --depth=0
```

For a machine-readable SPDX or CycloneDX SBOM, use a tool such as [`@cyclonedx/cyclonedx-npm`](https://www.npmjs.com/package/@cyclonedx/cyclonedx-npm):

```bash
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
```
