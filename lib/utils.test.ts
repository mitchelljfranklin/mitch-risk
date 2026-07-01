import { describe, expect, it } from "vitest";

import { formatPercent } from "@/lib/utils";

describe("formatPercent", () => {
  it("formats a ratio as a whole percentage", () => {
    expect(formatPercent(0.732)).toBe("73%");
  });

  it("supports fraction digits", () => {
    expect(formatPercent(0.5, 1)).toBe("50.0%");
  });

  it("clamps values to the 0-1 range", () => {
    expect(formatPercent(1.5)).toBe("100%");
    expect(formatPercent(-0.2)).toBe("0%");
  });
});
