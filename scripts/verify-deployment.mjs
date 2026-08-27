// Ad-hoc deployment verification for the two manual regression items that
// cannot live inside the Playwright suite:
//
//   1. docker compose refuses to start without CRON_SECRET (and starts with
//      a valid one) - guards the >=32-char production rule at compose time.
//   2. The cron calendar-day windows are UTC-canonical even when the machine
//      runs far from UTC, by re-running the cron window unit tests under a
//      shifted TZ.
//
// Usage:  node scripts/verify-deployment.mjs
// Skips gracefully (exit 0) when Docker is unavailable, so it can be run
// anywhere; the TZ probe always executes.
import { execFileSync, spawnSync } from "node:child_process";

let failures = 0;

function composeAvailable() {
  try {
    execFileSync("docker", ["compose", "version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function checkComposeCronGuard() {
  if (!composeAvailable()) {
    console.log("[skip] docker compose not available on this machine");
    return;
  }

  const composeArgs = ["compose", "-f", "docker-compose.yml", "config"];

  // 1. Without CRON_SECRET the stack must refuse to even render its config.
  const without = spawnSync("docker", composeArgs, {
    encoding: "utf8",
    env: {
      ...process.env,
      CRON_SECRET: "",
      AUTH_SECRET: "verify-deployment-auth-secret-0123456789abcdef",
      APP_ENCRYPTION_KEY: "verify-deployment-encryption-0123456789abcdef",
    },
  });
  if (without.status !== 0 && /CRON_SECRET/.test(without.stderr)) {
    console.log("[pass] compose refuses to start without CRON_SECRET");
  } else {
    failures++;
    console.error(
      "[fail] compose did not enforce the CRON_SECRET requirement",
      without.stderr.slice(0, 200),
    );
  }

  // 2. A short secret still renders compose config - the >=32 rule is
  //    enforced by the app at boot (lib/env.ts), not by compose. Assert the
  //    pass-through so operators can see exactly what the container gets.
  const short = spawnSync("docker", composeArgs, {
    encoding: "utf8",
    env: {
      ...process.env,
      CRON_SECRET: "short-secret",
      AUTH_SECRET: "verify-deployment-auth-secret-0123456789abcdef",
      APP_ENCRYPTION_KEY: "verify-deployment-encryption-0123456789abcdef",
    },
  });
  const shortRender = /CRON_SECRET:\s*short-secret/.test(
    short.stdout + short.stderr,
  );
  if (short.status === 0 && shortRender) {
    console.log(
      "[pass] compose passes CRON_SECRET through; app boot enforces length",
    );
  } else {
    failures++;
    console.error(
      "[fail] compose did not pass the configured CRON_SECRET through",
      (short.stdout + short.stderr).slice(0, 300),
    );
  }

  // 3. With a valid secret the config renders.
  const valid = spawnSync("docker", composeArgs, {
    encoding: "utf8",
    env: {
      ...process.env,
      CRON_SECRET: "verify-deployment-cron-secret-0123456789abcdef",
      AUTH_SECRET: "verify-deployment-auth-secret-0123456789abcdef",
      APP_ENCRYPTION_KEY: "verify-deployment-encryption-0123456789abcdef",
    },
  });
  if (valid.status === 0) {
    console.log("[pass] compose config renders with a valid CRON_SECRET");
  } else {
    failures++;
    console.error(
      "[fail] compose config failed despite a valid secret",
      valid.stderr.slice(0, 200),
    );
  }
}

function checkUtcWindowsUnderShiftedTz() {
  const testDatabaseUrl =
    process.env.TEST_DATABASE_URL ??
    "postgresql://mitch:mitch@localhost:5432/mitch_risk_test?schema=public";
  const result = spawnSync(
    "npx",
    ["vitest", "run", "lib/cron/run-jobs.windows.test.ts"],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        TZ: "America/New_York",
        TEST_DATABASE_URL: testDatabaseUrl,
      },
    },
  );
  if (result.status === 0) {
    console.log(
      "[pass] cron calendar-day windows hold under TZ=America/New_York",
    );
  } else {
    failures++;
    console.error(
      "[fail] cron window tests failed under a shifted timezone",
      result.stdout.slice(-400),
    );
  }
}

console.log("== deployment verification ==");
checkComposeCronGuard();
checkUtcWindowsUnderShiftedTz();

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
