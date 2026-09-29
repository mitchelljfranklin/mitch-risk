import { describe, expect, it } from "vitest";

import {
  findingStatusUpdateSchema,
  type FindingStatusUpdateInput,
} from "@/lib/schemas/findings";

describe("findingStatusUpdateSchema", () => {
  it("accepts a valid status without a note", () => {
    const parsed = findingStatusUpdateSchema.safeParse({
      status: "REMEDIATED",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an optional resolution note", () => {
    const parsed = findingStatusUpdateSchema.safeParse({
      status: "RISK_ACCEPTED",
      resolutionNote: "Accepted by the risk committee.",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const value: FindingStatusUpdateInput = parsed.data;
      expect(value.resolutionNote).toBe("Accepted by the risk committee.");
    }
  });

  it("rejects a status outside the allowed set", () => {
    expect(
      findingStatusUpdateSchema.safeParse({ status: "OPEN" }).success,
    ).toBe(false);
    expect(
      findingStatusUpdateSchema.safeParse({ status: "CLOSED" }).success,
    ).toBe(false);
  });

  it("rejects a missing or non-string status", () => {
    expect(findingStatusUpdateSchema.safeParse({}).success).toBe(false);
    expect(findingStatusUpdateSchema.safeParse({ status: 123 }).success).toBe(
      false,
    );
  });

  it("rejects bodies that are not objects", () => {
    expect(findingStatusUpdateSchema.safeParse(null).success).toBe(false);
    expect(findingStatusUpdateSchema.safeParse([]).success).toBe(false);
    expect(findingStatusUpdateSchema.safeParse("REMEDIATED").success).toBe(
      false,
    );
  });

  it("rejects a non-string resolution note", () => {
    const parsed = findingStatusUpdateSchema.safeParse({
      status: "REMEDIATED",
      resolutionNote: { nested: true },
    });
    expect(parsed.success).toBe(false);
  });
});
