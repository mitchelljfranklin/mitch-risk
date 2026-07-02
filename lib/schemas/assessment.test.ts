import { describe, expect, it } from "vitest";

import { isAssessmentOverdue } from "@/lib/schemas/assessment";

const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

describe("isAssessmentOverdue", () => {
  it("is true only for past-due SENT/IN_PROGRESS assessments", () => {
    expect(isAssessmentOverdue(past, "SENT")).toBe(true);
    expect(isAssessmentOverdue(past, "IN_PROGRESS")).toBe(true);
  });

  it("is false when there is no due date", () => {
    expect(isAssessmentOverdue(null, "SENT")).toBe(false);
    expect(isAssessmentOverdue(undefined, "IN_PROGRESS")).toBe(false);
  });

  it("is false when the due date is in the future", () => {
    expect(isAssessmentOverdue(future, "SENT")).toBe(false);
  });

  it("is false for statuses that are not awaiting the vendor", () => {
    expect(isAssessmentOverdue(past, "DRAFT")).toBe(false);
    expect(isAssessmentOverdue(past, "SUBMITTED")).toBe(false);
    expect(isAssessmentOverdue(past, "COMPLETED")).toBe(false);
  });

  it("accepts ISO date strings", () => {
    expect(isAssessmentOverdue(past.toISOString(), "SENT")).toBe(true);
  });
});
