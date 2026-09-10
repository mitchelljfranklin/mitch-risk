import { defineConfig } from "@playwright/test";
import path from "node:path";

// The standalone server chdirs to .next/standalone, so a relative
// EVIDENCE_STORAGE_PATH would make the server use a different storage root
// than the specs (whose cwd is the repo root). Pin an absolute path for
// BOTH processes — the config sets it before test files load, and the
// webServer env passes it to the spawned server.
process.env.EVIDENCE_STORAGE_PATH ??= path.resolve(".storage/evidence");

// Safety guard mirroring vitest.setup.ts: specs write and reset data through
// their own Prisma connection using the ambient DATABASE_URL, so an e2e run
// against a non-test database mutates real state. The webServer pin below
// only fixes the server process — the guard protects the spec process.
const databaseUrl = process.env.DATABASE_URL ?? "";
const looksLikeTestDatabase = /test/i.test(databaseUrl);
if (!looksLikeTestDatabase && process.env.ALLOW_TESTS_ON_THIS_DB !== "1") {
  throw new Error(
    [
      "Refusing to run e2e against a non-test database.",
      `  DATABASE_URL = ${databaseUrl.replace(/(:\/\/[^:/@]+:)[^@]*(@)/, "$1****$2")}`,
      "",
      "e2e specs mutate and reset data (settings, vendors, trust center).",
      "Set DATABASE_URL to a dedicated test database, e.g.:",
      '  $env:DATABASE_URL="postgresql://mitch:mitch@localhost:5432/mitch_risk_test?schema=public"',
      "(TEST_DATABASE_URL alone is not enough — specs read DATABASE_URL.)",
    ].join("\n"),
  );
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "node .next/standalone/server.js",
    url: "http://localhost:3000",
    // Never reuse a locally-running server: a dev server on the repo .env
    // (dev DB) makes server-side writes land in dev while specs hit the
    // test database — the silent split-brain that once wiped live settings
    // and broke the trust-center journeys. CI already starts a fresh
    // production server so e2e truly exercises the prod build; local runs
    // now do the same (standalone server starts in well under a second).
    reuseExistingServer: false,
    timeout: 120_000,
    // `next start` runs in production mode, where CRON_SECRET is required.
    // Pin the app/auth URL to localhost so the suite works regardless of the
    // developer's .env (which may point APP_URL at a real deployment — that
    // would make NextAuth redirect sign-in off localhost and break every test).
    env: {
      // >=32 chars so the production CRON_SECRET validation accepts it.
      CRON_SECRET:
        process.env.CRON_SECRET ?? "e2e-only-cron-secret-0123456789abcdef",
      APP_URL: "http://localhost:3000",
      AUTH_URL: "http://localhost:3000",
      // Pin the app to the same database the specs use (the ambient
      // DATABASE_URL, guarded above). Without this the standalone server
      // loads the repo .env (dev DB) at runtime and server-side writes
      // silently land in dev instead of the isolated test DB.
      DATABASE_URL: databaseUrl,
      EVIDENCE_STORAGE_PATH: process.env.EVIDENCE_STORAGE_PATH,
    },
  },
});
