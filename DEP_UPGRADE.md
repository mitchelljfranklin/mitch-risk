# Dependency Upgrade Plan — Prisma 7 + TypeScript 6

> **Purpose:** Trackable, pausable upgrade roadmap. Each stage gate has a checkbox.
> If interrupted, skip to the highest unchecked gate and resume.

---

## Pre-flight

- [ ] Read this entire document before starting
- [ ] Commit and push all current work (`git status` must be clean)
- [ ] Create a branch: `git checkout -b deps/prisma7-ts6`
- [ ] Have a fresh backup/snapshot of the dev database
- [ ] Ensure `npm run precheck` (typecheck + lint + format:check) passes clean

---

## Phase 1 — TypeScript 5.9 → 6.0

### 1.1 Install TypeScript 6

```bash
npm install -D typescript@^6
```

### 1.2 Update tsconfig.json

Add `"types": ["node"]` to `compilerOptions`. TS 6 defaults `types` to `[]` — without this,
`process.env`, `Buffer`, `fs`, and other Node.js globals will error.

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": ["node"],          // ← ADD THIS
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    // ... existing options unchanged
  }
}
```

Also ensure `target` is at least `ES2015` (deprecated `es5` removed). Current value `ES2017`
is fine. Bumping to `ES2023` is recommended but optional — Prisma 7 recommends it.

### 1.3 Verify

- [ ] `npm run typecheck` — zero errors
- [ ] `npm run lint` — same pre-existing warning count, no new errors
- [ ] `npm run format:check` — clean

### Stage Gate 1

- [x] ✅ TypeScript 6.0 installed
- [x] ✅ `types: ["node"]` added to tsconfig
- [x] ✅ Typecheck, lint, format all pass

---

## Phase 2 — Prisma 6 → 7: Dependencies & Configuration

### 2.1 Install Prisma 7 packages

```bash
npm install @prisma/client@^7 @prisma/adapter-pg@^7
npm install -D prisma@^7
```

Remove `package.json` → `"prisma"` seed config block (moves to `prisma.config.ts`):

```jsonc
// BEFORE — REMOVE THIS BLOCK
"prisma": {
  "seed": "tsx prisma/seed.ts"
},
```

Update npm scripts in `package.json`:

```jsonc
// BEFORE
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:seed": "prisma db seed",

// AFTER (same commands, just running through prisma.config.ts now)
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:deploy": "prisma migrate deploy",
"db:seed": "prisma db seed",
"db:studio": "prisma studio"
```

### 2.2 Create `prisma.config.ts` (project root)

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

> **Note:** The `import "dotenv/config"` at the top is required because Prisma 7 no longer
> auto-loads `.env` files. `dotenv` is already in `devDependencies`.

### 2.3 Update `prisma/schema.prisma`

```prisma
// BEFORE
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// AFTER
generator client {
  provider = "prisma-client"
  output   = "./generated/prisma"
}

datasource db {
  provider = "postgresql"
  // url moved to prisma.config.ts
}
```

### 2.4 Verify

- [ ] `npx prisma generate` — succeeds, creates `prisma/generated/prisma/` directory
- [ ] `npx prisma validate` — schema is valid

### Stage Gate 2

- [x] ✅ Prisma 7 packages installed
- [x] ✅ `prisma.config.ts` created
- [x] ✅ Schema generator updated (`prisma-client` + `output`)
- [x] ✅ Datasource `url` removed from schema
- [x] ✅ `package.json` seed block removed
- [x] ✅ `npm run db:generate` succeeds

---

## Phase 3 — Code Changes: Prisma Client Instantiation

### 3.1 Rewrite `lib/prisma.ts`

```ts
// BEFORE
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

```ts
// AFTER
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

> **Important:** The import path `./generated/prisma/client` is relative to `lib/prisma.ts`.
> The generated output lives at `prisma/generated/prisma/` per the schema generator config.
> From `lib/`, the relative path is `../prisma/generated/prisma/client`.

Correct import path: `"../prisma/generated/prisma/client"`

### 3.2 Update `prisma/seed.ts`

```ts
// BEFORE
import { Prisma, PrismaClient, QuestionType, RiskWeight } from "@prisma/client";

// AFTER
import { Prisma, PrismaClient, QuestionType, RiskWeight } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });
```

> `prisma/seed.ts` currently creates its own `PrismaClient` instance. After upgrading,
> it needs the driver adapter too. The relative path from `prisma/seed.ts` to
> `prisma/generated/prisma/client` is `../generated/prisma/client`.

### Stage Gate 3

- [x] ✅ `lib/prisma.ts` rewritten with adapter
- [x] ✅ `prisma/seed.ts` rewritten with adapter
- [x] ✅ Import paths verified

---

## Phase 4 — Code Changes: All `@prisma/client` Import Paths

Every file that imports from `@prisma/client` must point to the new generated output.
The relative path varies by file location. All generated types live in `prisma/generated/prisma/`.

### 4.1 Import path table

The generated output is at `prisma/generated/prisma/client`. Relative paths from each file:

| Location | Files | New import |
|---|---|---|
| `lib/` | 13 files | `"../prisma/generated/prisma/client"` |
| `lib/actions/` | 6 files | `"../../prisma/generated/prisma/client"` |
| `lib/db/` | 8 files | `"../../prisma/generated/prisma/client"` |
| `lib/email/` | 1 file | `"../../prisma/generated/prisma/client"` |
| `lib/settings/` | 2 files | `"../../prisma/generated/prisma/client"` |
| `app/(auth)/setup/` | 1 file | `"../../../prisma/generated/prisma/client"` |
| `app/(internal)/settings/` | 1 file | `"../../../prisma/generated/prisma/client"` |
| `app/api/v1/findings/` | 1 file | `"../../../../../prisma/generated/prisma/client"` |

**Excluded from search-and-replace:**
- `lib/prisma.ts` — already done in Phase 3
- `prisma/seed.ts` — already done in Phase 3

### 4.2 Files to update (25 files)

**`lib/` directory (13 files):**

- `lib/scoring.ts` — `import { type RiskWeight } from "@prisma/client"`
- `lib/json.ts` — `import { Prisma } from "@prisma/client"`
- `lib/api-keys.ts` — (check if it imports prisma types)
- `lib/break-glass.ts` — (check if it imports prisma types)
- `lib/webhooks.ts` — `import { type WebhookEvent, type WebhookPlatform } from "@prisma/client"`
- Other files in `lib/` that import from `@prisma/client`

**`lib/actions/` directory (6 files):**

- `lib/actions/findings.ts` — `import { type FindingStatus } from "@prisma/client"`
- `lib/actions/frameworks.ts` — (check)
- `lib/actions/profile.ts` — `import { type Prisma } from "@prisma/client"`
- `lib/actions/roles.ts` — `import { Prisma } from "@prisma/client"`
- `lib/actions/templates.ts` — `import { Prisma, type QuestionType, type RiskWeight } from "@prisma/client"`
- `lib/actions/users.ts` — `import { Prisma } from "@prisma/client"`

**`lib/db/` directory (8 files):**

- `lib/db/assessments.ts`
- `lib/db/audit.ts`
- `lib/db/certifications.ts`
- `lib/db/compliance.ts`
- `lib/db/findings.ts`
- `lib/db/frameworks.ts`
- `lib/db/notifications.ts`
- `lib/db/roles.ts`
- `lib/db/templates.ts`
- `lib/db/users.ts`
- `lib/db/vendors.ts`
- `lib/db/webhooks.ts`

**Other (4 files):**

- `lib/email/mailer.ts`
- `lib/settings/index.ts`
- `app/(auth)/setup/actions.ts`
- `app/(internal)/settings/actions.ts`

### 4.3 Systematic replacement approach

Do NOT use global find-and-replace. Work file by file:

1. Open each file
2. Change `from "@prisma/client"` to the correct relative path
3. Save
4. Rinse and repeat

### 4.4 Verify

- [ ] `npm run typecheck` — zero errors (catches any missed or wrong-path imports immediately)
- [ ] `npm run lint` — zero new errors

### Stage Gate 4

- [x] ✅ All 25+ files updated with correct relative import paths
- [x] ✅ `npm run typecheck` passes
- [x] ✅ `npm run lint` passes

---

## Phase 5 — Integration & Docker

### 5.1 Update `Dockerfile`

The Dockerfile needs changes for Prisma 7:

1. **Build stage** — `prisma generate` now needs `prisma.config.ts` in context and `dotenv` to load env vars. The `DATABASE_URL` build-time env is already set (line 13).

2. **Runner stage** — `prisma migrate deploy` and `prisma db seed` at startup (line 35) work the same way but read from `prisma.config.ts` instead of schema. The `prisma` CLI reads `prisma.config.ts` automatically.

3. **Generated client** — the standalone output (`next build` with `output: "standalone"`) already copies `prisma/` directory. The generated client at `prisma/generated/prisma/` is inside `prisma/` included in the copy (`COPY --from=build /app/prisma ./prisma`).

Changes needed:

```dockerfile
# Line 18: Add prisma.config.ts awareness (already fine if it's in build context)
# The COPY . . at line 17 includes prisma.config.ts

# Line 35: No change needed — prisma CLI auto-reads prisma.config.ts
# The CMD still works: npx prisma migrate deploy && npx prisma db seed && node server.js
```

No Dockerfile changes required beyond what's already in place. The `prisma.config.ts` is
picked up automatically since it's at the project root and copied during `COPY . .`.

### 5.2 Update npm scripts

No changes needed beyond Phase 2.2. The commands remain identical — they just read from
`prisma.config.ts` instead of `package.json` / `schema.prisma` directly.

### 5.3 CI/CD

Check `.github/workflows/ci.yml` for Prisma steps:

- `prisma generate` — same command, now needs `prisma.config.ts` (already in repo)
- `prisma migrate deploy` — same command

### Stage Gate 5

- [x] ✅ Dockerfile reviewed — no changes needed
- [x] ✅ CI workflow reviewed — no changes needed
- [x] ✅ npm scripts verified
- [x] ✅ `.gitignore` updated with `prisma/generated/`

---

## Phase 6 — Full Verification

### 6.1 Development environment

- [ ] `npm run dev` — app starts, can log in
- [ ] Dashboard loads with vendor data
- [ ] Vendor detail page loads
- [ ] Assessment detail page loads
- [ ] Create a test assessment and verify it saves
- [ ] Portal token link works (vendor can submit questionnaire)
- [ ] Settings page loads all tabs
- [ ] API docs at `/docs` load

### 6.2 Test suite

- [ ] `npm run test` — all unit/integration tests pass
- [ ] `npm run test:e2e` — all Playwright tests pass (requires test DB)
- [ ] `npm run build` — production build succeeds

### 6.3 Docker build

- [ ] `docker compose build` — builds successfully
- [ ] `docker compose up` — container starts, healthcheck passes
- [ ] App accessible at `http://localhost:3000`
- [ ] Migrations apply on first run
- [ ] Seed runs on first run

### 6.4 Connection pooling validation

Prisma 7 uses `node-pg` connection pooling via the driver adapter. Defaults differ from
Prisma 6's Rust engine:

| Setting | Prisma 6 default | node-pg default | Action |
|---|---|---|---|
| Connection timeout | 5 seconds | 0 (none) | Recommend setting on adapter |
| Pool size (max) | `num_cpus * 2 + 1` | 10 | Acceptable for most deployments |
| Idle timeout | 10 seconds | 10 seconds | Same |

If timeouts occur in production, configure the adapter explicitly:

```ts
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  pool: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
});
```

- [ ] Pooling settings reviewed for production needs

### Stage Gate 6

- [x] ✅ Dev server works end-to-end
- [ ] All tests pass (requires running test DB)
- [x] ✅ Production build succeeds
- [ ] Docker build works (requires Docker)
- [ ] Pooling settings confirmed (needs production deployment)

---

## Phase 7 — Documentation Sync

### 7.1 Files to update

- [x] `README.md` — webhook events format corrected, permission count updated
- [x] `ARCHITECTURE.md` — permission catalog updated
- [x] `AGENTS.md` — revalidatePath guidance relaxed
- [x] `docs/user-guides/rbac.md` — 22→23 permissions, PROFILE_VIEW added
- [x] `docs/configuration/webhooks.md` — name + platform fields documented
- [x] `docs/configuration/overview.md` — permission count updated
- [x] `APPSECURITY.md` — permission count updated
- [x] `authstage.md` — permission count updated
- [x] `package.json` — version strings in dependency list

### Stage Gate 7

- [x] ✅ Documentation updated with new versions

---

## Rollback Plan

If the upgrade fails:

1. `git checkout master` (or previous branch) — reverts all code
2. `rm -rf node_modules && npm install` — restores previous deps
3. `rm -rf prisma/generated` — removes new generated client
4. Restore database from pre-upgrade snapshot if schema was altered

No schema migration is part of this upgrade, so database rollback is unlikely needed.

---

## Completed

- [x] Phase 1 — TypeScript 6.0
- [x] Phase 2 — Prisma 7 deps & config
- [x] Phase 3 — Prisma client instantiation
- [x] Phase 4 — Import path migration (25 files)
- [x] Phase 5 — Docker & CI
- [~] Phase 6 — Full verification (build ✓, tests + Docker require DB)
- [x] Phase 7 — Documentation sync

---

## Post-Phase Fixes

**Client-component bundling issues** (Turbopack pulling `pg`/`dns` into browser):

| Fix | File | Change |
|---|---|---|
| 1 | `lib/prisma.ts` | Lazy `require()` for adapter — `@prisma/adapter-pg` only loads at client creation time |
| 2 | `lib/db/notifications-types.ts` | **New** — `EMAIL_TYPE_LABELS`, `EmailLogEntry`, `EmailLogResult`, `EmailLogFilters` |
| 2 | `app/(internal)/settings/email-tracking.tsx` | Imports from `notifications-types.ts` |
| 3 | `lib/db/audit-types.ts` | **New** — `AUDIT_ACTION_LABELS`, `AuditLogEntry`, `AuditLogResult`, `AuditLogFilters` |
| 3 | `app/(internal)/settings/audit-form.tsx` | Imports from `audit-types.ts` |
| 4 | `.gitignore` | Added `prisma/generated/` |
| 5 | `eslint.config.mjs` | Added `_` prefix ignore patterns for unused vars |
- [ ] Merge to master
