import { type RiskWeight } from "@prisma/client";

export type RiskWeightValues = Record<RiskWeight, number>;

export type QuestionSnapshot = {
  id: string;
  type: string;
  riskWeight: RiskWeight;
  expectedAnswer: unknown;
};

export type ResponseData = {
  id: string;
  assessmentQuestionId: string;
  value: unknown;
  isNotApplicable: boolean;
};

export type ScoredResponse = {
  id: string;
  isCompliant: boolean | null;
  weightedScore: number;
  maxScore: number;
};

function isAutoScorable(type: string): boolean {
  return (
    type === "YES_NO" ||
    type === "MULTIPLE_CHOICE" ||
    type === "NUMERIC" ||
    type === "COMBOBOX" ||
    type === "MULTI_SELECT" ||
    type === "RATING" ||
    type === "CHECKBOX"
  );
}

function parseBoolean(input: unknown): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "number") return input === 1;
  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    return (
      normalized === "true" ||
      normalized === "yes" ||
      normalized === "on" ||
      normalized === "1" ||
      normalized === "checked"
    );
  }
  return false;
}

export function isCompliant(
  type: string,
  value: unknown,
  expectedAnswer: unknown,
): boolean | null {
  if (!isAutoScorable(type)) {
    return null;
  }
  if (value === null || value === undefined) {
    return false;
  }

  if (type === "NUMERIC" || type === "RATING") {
    if (typeof value === "number" && typeof expectedAnswer === "number") {
      return value === expectedAnswer;
    }
    return Number(value) === Number(expectedAnswer);
  }

  if (type === "MULTI_SELECT") {
    const selected = Array.isArray(value)
      ? (value as unknown[]).map(String).sort()
      : [];
    const expected = Array.isArray(expectedAnswer)
      ? (expectedAnswer as unknown[]).map(String).sort()
      : [];
    if (selected.length === 0 || expected.length === 0) {
      return false;
    }
    return (
      selected.length === expected.length &&
      selected.every((value, i) => value === expected[i])
    );
  }

  if (type === "COMBOBOX") {
    return String(value) === String(expectedAnswer);
  }

  if (type === "CHECKBOX") {
    return parseBoolean(value) === parseBoolean(expectedAnswer);
  }

  return String(value) === String(expectedAnswer);
}

export function scoreResponses(
  questions: QuestionSnapshot[],
  responses: ResponseData[],
  riskWeights: RiskWeightValues,
): ScoredResponse[] {
  const questionMap = new Map(
    questions.map((question) => [question.id, question]),
  );

  return responses.map((response) => {
    const question = questionMap.get(response.assessmentQuestionId);
    if (!question) {
      return {
        id: response.id,
        isCompliant: null,
        weightedScore: 0,
        maxScore: 0,
      };
    }
    if (response.isNotApplicable) {
      return {
        id: response.id,
        isCompliant: null,
        weightedScore: 0,
        maxScore: 0,
      };
    }

    const weight = riskWeights[question.riskWeight] ?? 0;
    const compliance = isCompliant(
      question.type,
      response.value,
      question.expectedAnswer,
    );
    const weightedScore = compliance === true ? weight : 0;
    const maxScore = compliance === null ? 0 : weight;

    return {
      id: response.id,
      isCompliant: compliance,
      weightedScore,
      maxScore,
    };
  });
}

export function computeTotalScore(scored: ScoredResponse[]): number | null {
  const totalWeighted = scored.reduce(
    (sum, response) => sum + response.weightedScore,
    0,
  );
  const totalMax = scored.reduce((sum, response) => sum + response.maxScore, 0);
  return totalMax > 0 ? totalWeighted / totalMax : null;
}
