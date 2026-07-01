export type PortalConditionalLogic = {
  questionId: string;
  equals: string;
};

export type PortalAnswerValue = {
  value: string | number | boolean | string[] | null;
  isNotApplicable: boolean;
};

export type PortalAnswers = Record<string, PortalAnswerValue>;

export type PortalQuestionSummary = {
  id: string;
  required: boolean;
  conditionalLogic: unknown;
};

export function parseConditionalLogic(
  logic: unknown,
): PortalConditionalLogic | null {
  if (
    logic &&
    typeof logic === "object" &&
    !Array.isArray(logic) &&
    "questionId" in logic
  ) {
    const record = logic as Record<string, unknown>;
    if (typeof record.questionId === "string" && record.questionId.length > 0) {
      return {
        questionId: record.questionId,
        equals: typeof record.equals === "string" ? record.equals : "",
      };
    }
  }
  return null;
}

export function isQuestionVisible(
  conditionalLogic: unknown,
  answers: PortalAnswers,
): boolean {
  const logic = parseConditionalLogic(conditionalLogic);
  if (!logic) {
    return true;
  }
  const controllingAnswer = answers[logic.questionId];
  if (!controllingAnswer) {
    return false;
  }
  return String(controllingAnswer.value ?? "") === logic.equals;
}

export function hasAnswer(answer: PortalAnswerValue | undefined): boolean {
  if (!answer) {
    return false;
  }
  if (answer.isNotApplicable) {
    return true;
  }
  const { value } = answer;
  if (value === null || value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

export function findMissingRequiredQuestions<T extends PortalQuestionSummary>(
  questions: T[],
  answers: PortalAnswers,
): T[] {
  return questions.filter((question) => {
    if (!question.required) {
      return false;
    }
    if (!isQuestionVisible(question.conditionalLogic, answers)) {
      return false;
    }
    return !hasAnswer(answers[question.id]);
  });
}
