import { describe, expect, it } from "vitest";

import {
  findMissingRequiredQuestions,
  hasAnswer,
  isQuestionVisible,
  type PortalAnswers,
} from "@/lib/portal";

describe("isQuestionVisible", () => {
  it("shows questions with no conditional logic", () => {
    expect(isQuestionVisible(null, {})).toBe(true);
    expect(isQuestionVisible(undefined, {})).toBe(true);
  });

  it("shows a conditional question only when the controlling answer matches", () => {
    const logic = { questionId: "q1", equals: "YES" };
    expect(
      isQuestionVisible(logic, {
        q1: { value: "YES", isNotApplicable: false },
      }),
    ).toBe(true);
    expect(
      isQuestionVisible(logic, { q1: { value: "NO", isNotApplicable: false } }),
    ).toBe(false);
    expect(isQuestionVisible(logic, {})).toBe(false);
  });
});

describe("hasAnswer", () => {
  it("treats Not Applicable as answered", () => {
    expect(hasAnswer({ value: null, isNotApplicable: true })).toBe(true);
  });

  it("requires a non-empty value otherwise", () => {
    expect(hasAnswer(undefined)).toBe(false);
    expect(hasAnswer({ value: "", isNotApplicable: false })).toBe(false);
    expect(hasAnswer({ value: "  ", isNotApplicable: false })).toBe(false);
    expect(hasAnswer({ value: null, isNotApplicable: false })).toBe(false);
    expect(hasAnswer({ value: "YES", isNotApplicable: false })).toBe(true);
    expect(hasAnswer({ value: 0, isNotApplicable: false })).toBe(true);
  });
});

describe("findMissingRequiredQuestions", () => {
  const questions = [
    { id: "q1", required: true, conditionalLogic: null },
    {
      id: "q2",
      required: true,
      conditionalLogic: { questionId: "q1", equals: "YES" },
    },
    { id: "q3", required: false, conditionalLogic: null },
  ];

  it("flags only unanswered required visible questions", () => {
    const answers: PortalAnswers = {
      q1: { value: "YES", isNotApplicable: false },
    };
    const missing = findMissingRequiredQuestions(questions, answers);
    expect(missing.map((question) => question.id)).toEqual(["q2"]);
  });

  it("ignores hidden conditional questions", () => {
    const answers: PortalAnswers = {
      q1: { value: "NO", isNotApplicable: false },
    };
    expect(findMissingRequiredQuestions(questions, answers)).toEqual([]);
  });
});
