import {
  runScheduledJobs,
  type ScheduledJobsResult,
} from "@/lib/cron/run-jobs";
import { getCronSettings } from "@/lib/settings";

// How often the internal scheduler fires. Matches the documented external
// cron cadence; jobs are idempotent so a missed or repeated tick is safe.
const SCHEDULER_TICK_MS = 5 * 60 * 1000;

// In-process lock shared by the scheduler tick and the /api/cron/run route
// (same Node process), so the two triggers can never execute jobs
// concurrently. Multi-instance deployments must enable the scheduler on
// only one instance — see docs/deployment/docker.md.
let isRunInProgress = false;

export type ScheduledRunResult = ScheduledJobsResult | null;

// Runs all scheduled jobs unless a run is already executing in this
// process. Returns null when skipped because another run holds the lock.
export async function runScheduledJobsOnce(): Promise<ScheduledRunResult> {
  if (isRunInProgress) return null;
  isRunInProgress = true;
  try {
    return await runScheduledJobs();
  } finally {
    isRunInProgress = false;
  }
}

function summariseRun(result: ScheduledJobsResult): string {
  const parts = [
    `reminders=${result.reminders}`,
    `escalations=${result.escalations}`,
    `recurrences=${result.recurrences}`,
    `expiryNotices=${result.expiryNotices}`,
  ];
  if (result.pruned !== undefined) parts.push(`auditPruned=${result.pruned}`);
  if (result.prunedEmails !== undefined) {
    parts.push(`emailsPruned=${result.prunedEmails}`);
  }
  if (result.prunedFiles !== undefined) {
    parts.push(`filesPruned=${result.prunedFiles}`);
  }
  return parts.join(" ");
}

async function tick(): Promise<void> {
  try {
    const cronSettings = await getCronSettings();
    if (!cronSettings.internalSchedulerEnabled) return;

    const result = await runScheduledJobsOnce();
    if (!result) return;

    console.log(`[scheduler] run complete: ${summariseRun(result)}`);
  } catch (error) {
    // Expected during startup when the database is not reachable yet
    // (docker compose starts Postgres in parallel); retried next tick.
    console.error(
      "[scheduler] tick failed:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

declare global {
  var __mitchRiskSchedulerTimer: ReturnType<typeof setInterval> | undefined;
}

export function startScheduler(options?: { tickMs?: number }): void {
  if (globalThis.__mitchRiskSchedulerTimer) return;
  globalThis.__mitchRiskSchedulerTimer = setInterval(
    () => void tick(),
    options?.tickMs ?? SCHEDULER_TICK_MS,
  );
}

export function stopScheduler(): void {
  if (!globalThis.__mitchRiskSchedulerTimer) return;
  clearInterval(globalThis.__mitchRiskSchedulerTimer);
  globalThis.__mitchRiskSchedulerTimer = undefined;
}
