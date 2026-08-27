import { describe, expect, it } from "vitest";

import { addUtcDays, endOfUtcDay, utcDayStartOf } from "@/lib/cron/run-jobs";
import { formatDateUtc } from "@/lib/utils";

// Calendar-day math must run on UTC because date-only fields are stored as
// UTC-midnight instants. Before this was canonical, windows built from
// server-local midnight mis-captured boundaries for deployments west of UTC.
describe("cron calendar-day windows", () => {
  it("derives the UTC day start even late in the UTC day", () => {
    const now = new Date("2026-09-01T23:30:00Z");
    expect(utcDayStartOf(now).toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("rolls month boundaries forward and backward safely", () => {
    const endOfMonth = utcDayStartOf(new Date("2026-08-31T10:00:00Z"));
    expect(addUtcDays(endOfMonth, 7).toISOString()).toBe(
      "2026-09-07T00:00:00.000Z",
    );

    const firstOfDay = utcDayStartOf(new Date("2026-03-01T08:00:00Z"));
    expect(addUtcDays(firstOfDay, -3).toISOString()).toBe(
      "2026-02-26T00:00:00.000Z",
    );
  });

  it("closes a reminder window at the last millisecond of the target day", () => {
    const today = utcDayStartOf(new Date("2026-09-01T05:00:00Z"));
    const targetDay = addUtcDays(today, 7);
    const window = {
      gte: targetDay,
      lte: endOfUtcDay(targetDay),
    };
    // A vendor whose due date was entered as 2026-09-08 lands inside...
    expect(window.gte.getTime()).toBeLessThanOrEqual(
      Date.UTC(2026, 8, 8, 0, 0, 0, 0),
    );
    expect(window.lte.getTime()).toBeGreaterThanOrEqual(
      Date.UTC(2026, 8, 8, 12, 0, 0),
    );
    // ...and 2026-09-09 does not.
    expect(window.lte.getTime()).toBeLessThan(Date.UTC(2026, 8, 9));
  });

  it("captures overdue assessments strictly older than the threshold day", () => {
    const today = utcDayStartOf(new Date("2026-09-10T18:00:00Z"));
    const overdueSince = addUtcDays(today, -3);
    // Due 2026-09-06 (past) is overdue; due exactly 2026-09-07 is not yet
    // three full days back at any instant on that day.
    expect(overdueSince.toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });
});

describe("formatDateUtc", () => {
  it("renders date-only instants on the UTC calendar regardless of storage", () => {
    const storedDueDate = new Date("2026-09-08T00:00:00Z");
    expect(formatDateUtc(storedDueDate)).toBe("08 Sept 2026");
  });

  it("renders month and year rollovers on the UTC side", () => {
    expect(formatDateUtc(new Date("2026-12-31T23:59:59Z"))).toBe("31 Dec 2026");
    expect(formatDateUtc(new Date("2027-01-01T00:00:00Z"))).toBe("01 Jan 2027");
  });
});
