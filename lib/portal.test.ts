import { describe, expect, it } from "vitest";

import {
  findMissingRequiredQuestions,
  hasAnswer,
  isQuestionVisible,
  parseConditionalLogic,
  remapConditionalLogic,
  type PortalAnswers,
} from "@/lib/portal";

describe("isQuestionVisible", () => {
  it("shows questions with no conditional logic", () => {
    expect(isQuestionVisible(null, {})).toBe(true);
    expect(isQuestionVisible(undefined, {})).toBe(true);
  });

  it("supports the legacy { questionId, equals } shape", () => {
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

  it("evaluates comparison operators", () => {
    const answers: PortalAnswers = {
      count: { value: 150, isNotApplicable: false },
      tools: { value: ["AWS", "GCP"], isNotApplicable: false },
      notes: { value: "We use TOTP", isNotApplicable: false },
    };
    const rule = (questionId: string, operator: string, value: string) => ({
      match: "all",
      rules: [{ questionId, operator, value }],
    });

    expect(isQuestionVisible(rule("count", "gte", "100"), answers)).toBe(true);
    expect(isQuestionVisible(rule("count", "lt", "100"), answers)).toBe(false);
    expect(isQuestionVisible(rule("tools", "contains", "GCP"), answers)).toBe(
      true,
    );
    expect(
      isQuestionVisible(rule("tools", "notContains", "Azure"), answers),
    ).toBe(true);
    expect(isQuestionVisible(rule("notes", "contains", "totp"), answers)).toBe(
      true,
    );
    expect(isQuestionVisible(rule("count", "answered", ""), answers)).toBe(
      true,
    );
    expect(isQuestionVisible(rule("missing", "notAnswered", ""), answers)).toBe(
      true,
    );
  });

  it("combines multiple rules with all/any", () => {
    const answers: PortalAnswers = {
      a: { value: "YES", isNotApplicable: false },
      b: { value: "NO", isNotApplicable: false },
    };
    const rules = [
      { questionId: "a", operator: "equals", value: "YES" },
      { questionId: "b", operator: "equals", value: "YES" },
    ];
    expect(isQuestionVisible({ match: "all", rules }, answers)).toBe(false);
    expect(isQuestionVisible({ match: "any", rules }, answers)).toBe(true);
  });
});

describe("parseConditionalLogic / remapConditionalLogic", () => {
  it("normalizes the legacy shape into rules", () => {
    const parsed = parseConditionalLogic({ questionId: "q1", equals: "YES" });
    expect(parsed).toEqual({
      match: "all",
      rules: [{ questionId: "q1", operator: "equals", value: "YES" }],
    });
  });

  it("remaps every rule's questionId", () => {
    const idMap = new Map([
      ["q1", "new1"],
      ["q2", "new2"],
    ]);
    const remapped = remapConditionalLogic(
      {
        match: "any",
        rules: [
          { questionId: "q1", operator: "equals", value: "YES" },
          { questionId: "q2", operator: "answered", value: "" },
        ],
      },
      idMap,
    );
    expect(remapped?.rules.map((rule) => rule.questionId)).toEqual([
      "new1",
      "new2",
    ]);
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
