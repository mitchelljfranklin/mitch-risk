import { describe, expect, it } from "vitest";

import {
  normalizeExpectedAnswerForEditor,
  validateExpectedAnswer,
} from "@/lib/schemas/template";

describe("normalizeExpectedAnswerForEditor", () => {
  it("returns an empty string for null or undefined", () => {
    expect(normalizeExpectedAnswerForEditor(null)).toBe("");
    expect(normalizeExpectedAnswerForEditor(undefined)).toBe("");
  });

  it("maps arrays to string arrays", () => {
    expect(normalizeExpectedAnswerForEditor(["A", "B"])).toEqual(["A", "B"]);
    expect(normalizeExpectedAnswerForEditor([1, 2])).toEqual(["1", "2"]);
  });

  it("passes through strings and numbers unchanged", () => {
    expect(normalizeExpectedAnswerForEditor("YES")).toBe("YES");
    expect(normalizeExpectedAnswerForEditor(4)).toBe(4);
  });

  it("stringifies other JSON primitives", () => {
    expect(normalizeExpectedAnswerForEditor(true)).toBe("true");
    expect(normalizeExpectedAnswerForEditor(false)).toBe("false");
  });
});

describe("validateExpectedAnswer", () => {
  it("accepts an array of strings for MULTI_SELECT", () => {
    expect(validateExpectedAnswer("MULTI_SELECT", ["A", "B"])).toBeNull();
  });

  it("rejects a string for MULTI_SELECT", () => {
    expect(validateExpectedAnswer("MULTI_SELECT", "A\nB")).toMatch(
      /array of strings/,
    );
  });

  it("rejects a non-string element for MULTI_SELECT", () => {
    expect(validateExpectedAnswer("MULTI_SELECT", ["A", 1])).toMatch(
      /array of strings/,
    );
  });

  it("accepts a number for NUMERIC and RATING", () => {
    expect(validateExpectedAnswer("NUMERIC", 256)).toBeNull();
    expect(validateExpectedAnswer("RATING", 4)).toBeNull();
  });

  it("rejects a numeric string for NUMERIC and RATING", () => {
    expect(validateExpectedAnswer("NUMERIC", "256")).toMatch(/number/);
    expect(validateExpectedAnswer("RATING", "4")).toMatch(/number/);
  });

  it("accepts a string or array of strings for MULTIPLE_CHOICE and COMBOBOX", () => {
    expect(validateExpectedAnswer("MULTIPLE_CHOICE", "Optimized")).toBeNull();
    expect(
      validateExpectedAnswer("MULTIPLE_CHOICE", ["Optimized", "Perfect"]),
    ).toBeNull();
    expect(validateExpectedAnswer("COMBOBOX", "AWS")).toBeNull();
    expect(validateExpectedAnswer("COMBOBOX", ["AWS", "GCP"])).toBeNull();
  });

  it("rejects a number or non-string array for MULTIPLE_CHOICE and COMBOBOX", () => {
    expect(validateExpectedAnswer("MULTIPLE_CHOICE", 4)).toMatch(/string/);
    expect(validateExpectedAnswer("MULTIPLE_CHOICE", ["Optimized", 1])).toMatch(
      /string/,
    );
    expect(validateExpectedAnswer("COMBOBOX", 4)).toMatch(/string/);
  });

  it("accepts a missing expected answer for any type", () => {
    expect(validateExpectedAnswer("YES_NO", null)).toBeNull();
    expect(validateExpectedAnswer("FREE_TEXT", undefined)).toBeNull();
  });

  it("applies no constraint for other types", () => {
    expect(validateExpectedAnswer("YES_NO", "YES")).toBeNull();
    expect(validateExpectedAnswer("MULTIPLE_CHOICE", "Quarterly")).toBeNull();
    expect(validateExpectedAnswer("CHECKBOX", "true")).toBeNull();
  });
});
