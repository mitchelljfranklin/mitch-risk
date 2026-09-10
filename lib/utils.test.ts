import { describe, expect, it } from "vitest";

import {
  csvEscape,
  formatDateUtc,
  formatPercent,
  formatResponseValue,
  getField,
  isValidIsoDateString,
} from "@/lib/utils";

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

describe("csvEscape", () => {
  it("wraps values containing commas, quotes or newlines", () => {
    expect(csvEscape("plain")).toBe('"plain"');
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("escapes numbers and nulls safely", () => {
    expect(csvEscape(42)).toBe('"42"');
    expect(csvEscape(null)).toBe('""');
    expect(csvEscape(undefined)).toBe('""');
  });

  it("keeps embedded quotes closed correctly for parsers", () => {
    // RFC 4180: a quote inside a quoted field must be doubled.
    const cell = 'He said "no"';
    const escaped = csvEscape(cell);
    expect(escaped).toBe('"He said ""no"""');
  });
});

describe("formatResponseValue", () => {
  it("renders empties as an em dash", () => {
    expect(formatResponseValue(null)).toBe("—");
    expect(formatResponseValue(undefined)).toBe("—");
    expect(formatResponseValue("")).toBe("—");
  });

  it("joins arrays and stringifies the rest", () => {
    expect(formatResponseValue(["AWS", "GCP"])).toBe("AWS, GCP");
    expect(formatResponseValue(true)).toBe("true");
    expect(formatResponseValue(0)).toBe("0");
  });

  it("stringifies objects via their toString form rather than crashing", () => {
    expect(formatResponseValue({ a: 1 })).toBe("[object Object]");
  });
});

describe("getField", () => {
  it("returns strings from form data", () => {
    const formData = new FormData();
    formData.set("name", "Acme");
    expect(getField(formData, "name")).toBe("Acme");
  });

  it("returns empty string for missing keys and non-string entries", () => {
    const formData = new FormData();
    formData.append("file", new Blob(["x"]), "x.txt");
    expect(getField(formData, "missing")).toBe("");
    expect(getField(formData, "file")).toBe("");
  });
});

describe("isValidIsoDateString", () => {
  it("accepts real calendar dates", () => {
    expect(isValidIsoDateString("2026-02-28")).toBe(true);
    expect(isValidIsoDateString("2024-02-29")).toBe(true); // leap year
  });

  it("rejects rollovers and junk the Date parser would normalise", () => {
    expect(isValidIsoDateString("2026-02-31")).toBe(false);
    expect(isValidIsoDateString("2026-13-01")).toBe(false);
    expect(isValidIsoDateString("not-a-date")).toBe(false);
    expect(isValidIsoDateString("")).toBe(false);
    expect(isValidIsoDateString("2026-1-2")).toBe(false);
  });
});

describe("formatDateUtc", () => {
  it("locks date-only instants to the UTC calendar", () => {
    expect(formatDateUtc(new Date("2026-09-08T00:00:00Z"))).toBe(
      "08 Sept 2026",
    );
  });
});
