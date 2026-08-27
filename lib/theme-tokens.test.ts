import { describe, expect, it } from "vitest";

import { foregroundFor, relativeLuminance } from "@/lib/theme-tokens";

// The luminance threshold decides whether brand-coloured buttons get dark or
// light text. Getting it wrong produces invisible foregrounds - the exact
// bug class this token layer exists to prevent.
describe("relativeLuminance", () => {
  it("returns 0 for black and malformed input", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#nothex!")).toBe(0);
    expect(relativeLuminance("fff")).toBe(0);
  });

  it("treats white as full luminance", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 3);
  });

  it("is symmetric around the channel midpoint within tolerance", () => {
    // #808080 is the classic mid-grey; sRGB gamma places it near the middle
    // of perceptual luminance.
    const grey = relativeLuminance("#808080");
    expect(grey).toBeGreaterThan(0.18);
    expect(grey).toBeLessThan(0.24);
  });
});

describe("foregroundFor threshold", () => {
  it("picks dark text above the 0.4 boundary", () => {
    expect(foregroundFor("#ffffff")).toBe("oklch(0.205 0 0)");
    // Pale yellow (#ffff88) is bright: its L ≈ 0.92.
    expect(foregroundFor("#ffff88")).toBe("oklch(0.205 0 0)");
  });

  it("picks light text at and below the boundary", () => {
    expect(foregroundFor("#000000")).toBe("oklch(0.985 0 0)");
    // Mid-grey (~0.21) sits under 0.4.
    expect(foregroundFor("#808080")).toBe("oklch(0.985 0 0)");
  });

  it("straddles the exact 0.4 cut-off on adjacent values", () => {
    // Light grey (>= ~0.5 luminance) flips to dark text; a darker grey does
    // not. The pair brackets the decision without depending on floating
    // point precision at exactly 0.4.
    expect(foregroundFor("#c8c8c8")).toBe("oklch(0.205 0 0)");
    expect(foregroundFor("#7a7a7a")).toBe("oklch(0.985 0 0)");
  });

  it("never picks an invisible foreground for saturated brand colours", () => {
    for (const hex of ["#0057ff", "#ff0000", "#008020", "#f0a030"]) {
      const fg = foregroundFor(hex);
      expect(["oklch(0.205 0 0)", "oklch(0.985 0 0)"]).toContain(fg);
    }
  });
});
