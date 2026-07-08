import { describe, expect, it } from "vitest";

import {
  computeTotalScore,
  isCompliant,
  scoreResponses,
  type ResponseData,
  type ScoredResponse,
} from "@/lib/scoring";

const defaultWeights = {
  CRITICAL: 10,
  HIGH: 6,
  MEDIUM: 3,
  LOW: 1,
};

const questions = [
  {
    id: "q1",
    type: "YES_NO",
    riskWeight: "CRITICAL" as const,
    expectedAnswer: "YES",
  },
  {
    id: "q2",
    type: "MULTIPLE_CHOICE",
    riskWeight: "HIGH" as const,
    expectedAnswer: "TOTP",
  },
  {
    id: "q3",
    type: "NUMERIC",
    riskWeight: "MEDIUM" as const,
    expectedAnswer: 256,
  },
  {
    id: "q4",
    type: "FREE_TEXT",
    riskWeight: "LOW" as const,
    expectedAnswer: null,
  },
  {
    id: "q5",
    type: "YES_NO",
    riskWeight: "HIGH" as const,
    expectedAnswer: "YES",
  },
];

function assertCompliance(
  scored: ScoredResponse[],
  id: string,
  expected: boolean | null,
) {
  const entry = scored.find((s) => s.id === id);
  if (!entry) {
    throw new Error(`response ${id} not found`);
  }
  expect(entry.isCompliant).toBe(expected);
}

describe("scoring engine", () => {
  it("matches a hand-calculated expected score", () => {
    // q1 - CRITICAL(10), compliant YES → 10/10
    // q2 - HIGH(6),   non-compliant (SMS ≠ TOTP) → 0/6
    // q3 - MEDIUM(3),  compliant (256 = 256) → 3/3
    // q4 - LOW(1),     unscored (FREE_TEXT) → 0/0
    // q5 - HIGH(6),    N/A → 0/0
    const responses: ResponseData[] = [
      {
        id: "r1",
        assessmentQuestionId: "q1",
        value: "YES",
        isNotApplicable: false,
      },
      {
        id: "r2",
        assessmentQuestionId: "q2",
        value: "SMS",
        isNotApplicable: false,
      },
      {
        id: "r3",
        assessmentQuestionId: "q3",
        value: 256,
        isNotApplicable: false,
      },
      {
        id: "r4",
        assessmentQuestionId: "q4",
        value: "some text",
        isNotApplicable: false,
      },
      {
        id: "r5",
        assessmentQuestionId: "q5",
        value: "YES",
        isNotApplicable: true,
      },
    ];

    const scored = scoreResponses(questions, responses, defaultWeights);

    assertCompliance(scored, "r1", true);
    assertCompliance(scored, "r2", false);
    assertCompliance(scored, "r3", true);
    assertCompliance(scored, "r4", null);
    assertCompliance(scored, "r5", null);

    // hand-calculated: (10 + 0 + 3 + 0 + 0) / (10 + 6 + 3 + 0 + 0) = 13/19
    expect(computeTotalScore(scored)).toBeCloseTo(13 / 19, 4);
  });

  it("returns null when no scoreable questions exist (all N/A)", () => {
    const responses = questions.map((q) => ({
      id: q.id,
      assessmentQuestionId: q.id,
      value: null,
      isNotApplicable: true,
    }));
    expect(
      computeTotalScore(scoreResponses(questions, responses, defaultWeights)),
    ).toBeNull();
  });

  it("isCompliant handles numeric string coercion", () => {
    expect(isCompliant("NUMERIC", "256", 256)).toBe(true);
    expect(isCompliant("NUMERIC", 256, "256")).toBe(true);
    expect(isCompliant("NUMERIC", 128, 256)).toBe(false);
  });

  it("COMBOBOX matches by string equality", () => {
    expect(isCompliant("COMBOBOX", "AWS", "AWS")).toBe(true);
    expect(isCompliant("COMBOBOX", "GCP", "AWS")).toBe(false);
    expect(isCompliant("COMBOBOX", null, "AWS")).toBe(false);
    expect(isCompliant("COMBOBOX", "AWS", null)).toBe(false);
  });

  it("MULTI_SELECT matches by sorted set equality", () => {
    expect(isCompliant("MULTI_SELECT", ["AWS", "GCP"], ["GCP", "AWS"])).toBe(
      true,
    );
    expect(isCompliant("MULTI_SELECT", ["AWS"], ["AWS", "GCP"])).toBe(false);
    expect(isCompliant("MULTI_SELECT", ["AWS"], [])).toBe(false);
    expect(isCompliant("MULTI_SELECT", [], ["AWS"])).toBe(false);
    expect(isCompliant("MULTI_SELECT", null, ["AWS"])).toBe(false);
    expect(
      isCompliant("MULTI_SELECT", ["AWS", "GCP", "Azure"], ["AWS", "GCP"]),
    ).toBe(false);
  });

  it("RATING matches by numeric equality with coercion", () => {
    expect(isCompliant("RATING", 4, 4)).toBe(true);
    expect(isCompliant("RATING", "4", 4)).toBe(true);
    expect(isCompliant("RATING", 3, 4)).toBe(false);
    expect(isCompliant("RATING", null, 4)).toBe(false);
    expect(isCompliant("RATING", 5, "5")).toBe(true);
  });

  it("scores COMBOBOX, MULTI_SELECT, and RATING in weighted scoring", () => {
    const qs = [
      {
        id: "q1",
        type: "COMBOBOX",
        riskWeight: "HIGH" as const,
        expectedAnswer: "TOTP",
      },
      {
        id: "q2",
        type: "MULTI_SELECT",
        riskWeight: "CRITICAL" as const,
        expectedAnswer: ["Encryption", "AccessControl"],
      },
      {
        id: "q3",
        type: "RATING",
        riskWeight: "MEDIUM" as const,
        expectedAnswer: 5,
      },
    ];

    const responses: ResponseData[] = [
      {
        id: "r1",
        assessmentQuestionId: "q1",
        value: "TOTP",
        isNotApplicable: false,
      },
      {
        id: "r2",
        assessmentQuestionId: "q2",
        value: ["AccessControl", "Encryption"],
        isNotApplicable: false,
      },
      {
        id: "r3",
        assessmentQuestionId: "q3",
        value: 5,
        isNotApplicable: false,
      },
    ];

    const scored = scoreResponses(qs, responses, defaultWeights);

    assertCompliance(scored, "r1", true);
    assertCompliance(scored, "r2", true);
    assertCompliance(scored, "r3", true);

    // 6 + 10 + 3 = 19 / 19 = 1.0
    expect(computeTotalScore(scored)).toBeCloseTo(1.0, 4);
  });

  it("free-text and file-upload are never auto-scorable", () => {
    expect(isCompliant("FREE_TEXT", "some answer", "expected")).toBeNull();
    expect(isCompliant("FILE_UPLOAD", "file.pdf", "anything")).toBeNull();
  });

  it("CHECKBOX compares parsed booleans (string 'false' is falsey)", () => {
    // expected checked
    expect(isCompliant("CHECKBOX", true, "true")).toBe(true);
    expect(isCompliant("CHECKBOX", "true", "true")).toBe(true);
    expect(isCompliant("CHECKBOX", false, "true")).toBe(false);
    // expected unchecked — the previously-broken case
    expect(isCompliant("CHECKBOX", false, "false")).toBe(true);
    expect(isCompliant("CHECKBOX", "false", "false")).toBe(true);
    expect(isCompliant("CHECKBOX", true, "false")).toBe(false);
    // null value is non-compliant
    expect(isCompliant("CHECKBOX", null, "true")).toBe(false);
  });
});
