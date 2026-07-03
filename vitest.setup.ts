import { config } from "dotenv";

// Load base env, then an optional test-only override file.
config();
config({ path: ".env.test", override: true });

// Integration tests hit a real database. Point them at a dedicated test
// database when TEST_DATABASE_URL is provided so they never touch dev/prod data.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

function redactDatabaseUrl(url: string): string {
  return url.replace(/(:\/\/[^:/@]+:)[^@]*(@)/, "$1****$2");
}

// Safety guard: refuse to run against a database that is not clearly a test
// database. The integration tests delete and reset data (settings, notification
// logs, etc.), so running them against a dev/prod database wipes real state.
const databaseUrl = process.env.DATABASE_URL ?? "";
const looksLikeTestDatabase = /test/i.test(databaseUrl);
const explicitlyAllowed = process.env.ALLOW_TESTS_ON_THIS_DB === "1";

if (databaseUrl && !looksLikeTestDatabase && !explicitlyAllowed) {
  throw new Error(
    [
      "Refusing to run tests against a non-test database.",
      `  DATABASE_URL = ${redactDatabaseUrl(databaseUrl)}`,
      "",
      "Integration tests mutate and delete data (settings, notification logs, etc.).",
      "Set TEST_DATABASE_URL to a dedicated test database (recommended), e.g.:",
      '  TEST_DATABASE_URL="postgresql://mitch:mitch@localhost:5432/mitch_risk_test?schema=public"',
      "then create + migrate it (see README → Testing).",
      "",
      "To override intentionally (this WILL mutate that database), set ALLOW_TESTS_ON_THIS_DB=1.",
    ].join("\n"),
  );
}
