try {
  await import("dotenv/config");
} catch {
  // dotenv not available in production — env vars are set by Docker
}

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed-runner.cjs",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
