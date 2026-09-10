import "dotenv/config";

import { existsSync, readFileSync, unlinkSync } from "node:fs";

import {
  getAssessmentSettings,
  updateAssessmentSettings,
} from "@/lib/settings";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_FILE = "e2e/.ratelimit-original";

export default async function globalTeardown() {
  // Restore the login throttle that global-setup raised for the run.
  if (existsSync(RATE_LIMIT_FILE)) {
    const original = readFileSync(RATE_LIMIT_FILE, "utf8").trim();
    const originalLimit = Number(original);
    unlinkSync(RATE_LIMIT_FILE);
    if (Number.isFinite(originalLimit) && originalLimit > 0) {
      const current = await getAssessmentSettings();
      await updateAssessmentSettings({
        ...current,
        loginRateLimitPerMin: originalLimit,
      });
    }
  }

  await prisma.$disconnect();
}
