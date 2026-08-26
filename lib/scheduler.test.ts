import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runScheduledJobsMock = vi.fn();
const getCronSettingsMock = vi.fn();

vi.mock("@/lib/cron/run-jobs", () => ({
  runScheduledJobs: (...args: unknown[]) => runScheduledJobsMock(...args),
}));

vi.mock("@/lib/settings", () => ({
  getCronSettings: (...args: unknown[]) => getCronSettingsMock(...args),
}));

import {
  runScheduledJobsOnce,
  startScheduler,
  stopScheduler,
} from "@/lib/scheduler";

const SAMPLE_RESULT = {
  reminders: 2,
  escalations: 1,
  recurrences: 0,
  expiryNotices: 3,
};

describe("runScheduledJobsOnce", () => {
  beforeEach(() => {
    runScheduledJobsMock.mockReset();
    getCronSettingsMock.mockReset();
  });

  it("runs jobs and returns the result", async () => {
    runScheduledJobsMock.mockResolvedValue(SAMPLE_RESULT);

    const result = await runScheduledJobsOnce();

    expect(result).toEqual(SAMPLE_RESULT);
    expect(runScheduledJobsMock).toHaveBeenCalledTimes(1);
  });

  it("returns null while another run is in progress", async () => {
    let releaseFirstRun: (() => void) | undefined;
    const firstRunGate = new Promise<void>((resolve) => {
      releaseFirstRun = resolve;
    });
    runScheduledJobsMock.mockImplementationOnce(async () => {
      await firstRunGate;
      return SAMPLE_RESULT;
    });

    const firstRun = runScheduledJobsOnce();
    const overlappingRun = await runScheduledJobsOnce();

    expect(overlappingRun).toBeNull();

    releaseFirstRun!();
    await expect(firstRun).resolves.toEqual(SAMPLE_RESULT);
  });

  it("releases the lock so a later run can start", async () => {
    runScheduledJobsMock.mockResolvedValue(SAMPLE_RESULT);

    await runScheduledJobsOnce();
    const secondRun = await runScheduledJobsOnce();

    expect(secondRun).toEqual(SAMPLE_RESULT);
    expect(runScheduledJobsMock).toHaveBeenCalledTimes(2);
  });
});

describe("scheduler lifecycle", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    runScheduledJobsMock.mockReset();
    getCronSettingsMock.mockReset();
    vi.useFakeTimers();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    stopScheduler();
    vi.useRealTimers();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("runs a tick when enabled", async () => {
    getCronSettingsMock.mockResolvedValue({ internalSchedulerEnabled: true });
    runScheduledJobsMock.mockResolvedValue(SAMPLE_RESULT);

    startScheduler({ tickMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);

    expect(runScheduledJobsMock).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("reminders=2"));
  });

  it("skips ticks when the internal scheduler is disabled", async () => {
    getCronSettingsMock.mockResolvedValue({ internalSchedulerEnabled: false });

    startScheduler({ tickMs: 1000 });
    await vi.advanceTimersByTimeAsync(5000);

    expect(getCronSettingsMock).toHaveBeenCalled();
    expect(runScheduledJobsMock).not.toHaveBeenCalled();
  });

  it("does not start a second timer when already running", async () => {
    getCronSettingsMock.mockResolvedValue({ internalSchedulerEnabled: true });
    runScheduledJobsMock.mockResolvedValue(SAMPLE_RESULT);

    startScheduler({ tickMs: 1000 });
    startScheduler({ tickMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);

    expect(runScheduledJobsMock).toHaveBeenCalledTimes(1);
  });

  it("stops ticking after stopScheduler", async () => {
    getCronSettingsMock.mockResolvedValue({ internalSchedulerEnabled: true });
    runScheduledJobsMock.mockResolvedValue(SAMPLE_RESULT);

    startScheduler({ tickMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    stopScheduler();
    await vi.advanceTimersByTimeAsync(5000);

    expect(runScheduledJobsMock).toHaveBeenCalledTimes(1);
  });

  it("logs tick failures instead of throwing", async () => {
    getCronSettingsMock.mockRejectedValue(new Error("database not ready yet"));

    startScheduler({ tickMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);

    expect(errorSpy).toHaveBeenCalledWith(
      "[scheduler] tick failed:",
      "database not ready yet",
    );
    expect(runScheduledJobsMock).not.toHaveBeenCalled();
  });
});
