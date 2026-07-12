import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
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
    // Reuse a locally-running server for fast iteration, but always start a fresh
    // production server in CI so e2e truly exercises the prod build.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // `next start` runs in production mode, where CRON_SECRET is required.
    // Pin the app/auth URL to localhost so the suite works regardless of the
    // developer's .env (which may point APP_URL at a real deployment — that
    // would make NextAuth redirect sign-in off localhost and break every test).
    env: {
      CRON_SECRET: process.env.CRON_SECRET ?? "e2e-cron-secret",
      APP_URL: "http://localhost:3000",
      AUTH_URL: "http://localhost:3000",
    },
  },
});
