import { describe, expect, it } from "vitest";

import { compareResponses, type ResponseDiff } from "@/lib/compare";

// The transition matrix below locks the asymmetry that makes the vendor
// comparison view correct: null -> true is an improvement (an unscored
// question became compliant), true -> null is a degradation (a compliant
// answer lost its compliance verdict), and String coercion maps
// null/undefined values onto "".
type TransitionCase = {
  name: string;
  left: { value: unknown; isCompliant: boolean | null };
  right: { value: unknown; isCompliant: boolean | null };
  expected: Pick<
    ResponseDiff,
    | "answerChanged"
    | "complianceChanged"
    | "complianceImproved"
    | "complianceDegraded"
  >;
};

const cases: TransitionCase[] = [
  {
    name: "null -> true is an improvement",
    left: { value: "old", isCompliant: null },
    right: { value: "new", isCompliant: true },
    expected: {
      answerChanged: true,
      complianceChanged: true,
      complianceImproved: true,
      complianceDegraded: false,
    },
  },
  {
    name: "true -> null is a degradation",
    left: { value: "YES", isCompliant: true },
    right: { value: "YES", isCompliant: null },
    expected: {
      answerChanged: false,
      complianceChanged: true,
      complianceImproved: false,
      complianceDegraded: true,
    },
  },
  {
    name: "null -> false changes compliance without improving or degrading",
    left: { value: "x", isCompliant: null },
    right: { value: "y", isCompliant: false },
    expected: {
      answerChanged: true,
      complianceChanged: true,
      complianceImproved: false,
      complianceDegraded: false,
    },
  },
  {
    name: "false -> true is an improvement",
    left: { value: "NO", isCompliant: false },
    right: { value: "YES", isCompliant: true },
    expected: {
      answerChanged: true,
      complianceChanged: true,
      complianceImproved: true,
      complianceDegraded: false,
    },
  },
  {
    name: "true stays true with unchanged answers",
    left: { value: "YES", isCompliant: true },
    right: { value: "YES", isCompliant: true },
    expected: {
      answerChanged: false,
      complianceChanged: false,
      complianceImproved: false,
      complianceDegraded: false,
    },
  },
  {
    name: "answer-only change keeps compliance flags down",
    left: { value: "one", isCompliant: false },
    right: { value: "two", isCompliant: false },
    expected: {
      answerChanged: true,
      complianceChanged: false,
      complianceImproved: false,
      complianceDegraded: false,
    },
  },
  {
    name: "undefined and null both coerce to empty string",
    left: { value: undefined, isCompliant: false },
    right: { value: null, isCompliant: false },
    expected: {
      answerChanged: false,
      complianceChanged: false,
      complianceImproved: false,
      complianceDegraded: false,
    },
  },
];

describe("compareResponses", () => {
  it.each(cases)("$name", ({ left, right, expected }) => {
    expect(compareResponses(left, right)).toEqual(expected);
  });

  it("treats object values by their string form", () => {
    const result = compareResponses(
      { value: ["a", "b"], isCompliant: true },
      { value: "a,b", isCompliant: true },
    );
    expect(result.answerChanged).toBe(false);
  });
});
