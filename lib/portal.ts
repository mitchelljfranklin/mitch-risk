export const CONDITION_OPERATORS = [
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "gt",
  "lt",
  "gte",
  "lte",
  "answered",
  "notAnswered",
] as const;

export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "equals",
  notEquals: "does not equal",
  contains: "contains",
  notContains: "does not contain",
  gt: "greater than",
  lt: "less than",
  gte: "greater than or equal to",
  lte: "less than or equal to",
  answered: "is answered",
  notAnswered: "is not answered",
};

// Operators that don't need a comparison value.
export const VALUELESS_OPERATORS: ConditionOperator[] = [
  "answered",
  "notAnswered",
];

export type ConditionRule = {
  questionId: string;
  operator: ConditionOperator;
  value: string;
};

export type PortalConditionalLogic = {
  match: "all" | "any";
  rules: ConditionRule[];
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

function isOperator(value: unknown): value is ConditionOperator {
  return (
    typeof value === "string" &&
    CONDITION_OPERATORS.includes(value as ConditionOperator)
  );
}

export function parseConditionalLogic(
  logic: unknown,
): PortalConditionalLogic | null {
  if (!logic || typeof logic !== "object" || Array.isArray(logic)) {
    return null;
  }
  const record = logic as Record<string, unknown>;

  if (Array.isArray(record.rules)) {
    const rules: ConditionRule[] = [];
    for (const raw of record.rules) {
      if (!raw || typeof raw !== "object") continue;
      const rule = raw as Record<string, unknown>;
      if (typeof rule.questionId !== "string" || rule.questionId.length === 0) {
        continue;
      }
      const operator = isOperator(rule.operator) ? rule.operator : "equals";
      rules.push({
        questionId: rule.questionId,
        operator,
        value: typeof rule.value === "string" ? rule.value : "",
      });
    }
    if (rules.length === 0) return null;
    return { match: record.match === "any" ? "any" : "all", rules };
  }

  // Legacy shape: { questionId, equals }
  if (typeof record.questionId === "string" && record.questionId.length > 0) {
    return {
      match: "all",
      rules: [
        {
          questionId: record.questionId,
          operator: "equals",
          value: typeof record.equals === "string" ? record.equals : "",
        },
      ],
    };
  }

  return null;
}

function evaluateRule(rule: ConditionRule, answers: PortalAnswers): boolean {
  const controllingAnswer = answers[rule.questionId];

  if (rule.operator === "answered") return hasAnswer(controllingAnswer);
  if (rule.operator === "notAnswered") return !hasAnswer(controllingAnswer);

  const rawValue = controllingAnswer?.value;

  switch (rule.operator) {
    case "equals":
    case "notEquals": {
      // Case-insensitive by design: authors type condition values as free
      // text ("Yes") while the portal emits canonical tokens ("YES") — the
      // intent is unmistakably the same answer.
      const left = String(rawValue ?? "")
        .trim()
        .toLowerCase();
      const right = rule.value.trim().toLowerCase();
      return rule.operator === "equals" ? left === right : left !== right;
    }
    case "contains":
      if (Array.isArray(rawValue)) {
        return rawValue.map(String).includes(rule.value);
      }
      return String(rawValue ?? "")
        .toLowerCase()
        .includes(rule.value.toLowerCase());
    case "notContains":
      if (Array.isArray(rawValue)) {
        return !rawValue.map(String).includes(rule.value);
      }
      return !String(rawValue ?? "")
        .toLowerCase()
        .includes(rule.value.toLowerCase());
    case "gt":
    case "lt":
    case "gte":
    case "lte": {
      const left = Number(rawValue);
      const right = Number(rule.value);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
      if (rule.operator === "gt") return left > right;
      if (rule.operator === "lt") return left < right;
      if (rule.operator === "gte") return left >= right;
      return left <= right;
    }
    default:
      return true;
  }
}

export function isQuestionVisible(
  conditionalLogic: unknown,
  answers: PortalAnswers,
): boolean {
  const logic = parseConditionalLogic(conditionalLogic);
  if (!logic || logic.rules.length === 0) {
    return true;
  }
  return logic.match === "any"
    ? logic.rules.some((rule) => evaluateRule(rule, answers))
    : logic.rules.every((rule) => evaluateRule(rule, answers));
}

/**
 * Remaps each rule's questionId using the provided old→new id map (used when
 * cloning a template). Returns the remapped JSON or null when there's nothing.
 */
export function remapConditionalLogic(
  logic: unknown,
  idMap: Map<string, string>,
): PortalConditionalLogic | null {
  const parsed = parseConditionalLogic(logic);
  if (!parsed) return null;
  const rules = parsed.rules
    .map((rule) => {
      const mapped = idMap.get(rule.questionId);
      return mapped ? { ...rule, questionId: mapped } : null;
    })
    .filter((rule): rule is ConditionRule => rule !== null);
  if (rules.length === 0) return null;
  return { match: parsed.match, rules };
}

export function summarizeConditionalLogic(
  logic: unknown,
  questionText: Map<string, string>,
): string | null {
  const parsed = parseConditionalLogic(logic);
  if (!parsed) return null;
  const parts = parsed.rules.map((rule) => {
    const label = questionText.get(rule.questionId) ?? "a question";
    const short = label.length > 40 ? `${label.slice(0, 40)}…` : label;
    const operatorLabel = CONDITION_OPERATOR_LABELS[rule.operator];
    return VALUELESS_OPERATORS.includes(rule.operator)
      ? `“${short}” ${operatorLabel}`
      : `“${short}” ${operatorLabel} ${rule.value}`;
  });
  const joiner = parsed.match === "any" ? " OR " : " AND ";
  return `Shown if ${parts.join(joiner)}`;
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

// Vendor-facing review policy: internal reviewer notes are private unless the
// reviewer explicitly requested clarification - that is the one decision
// whose note is meant to be read by the vendor (it drives their rework).
export function isNoteVisibleToVendor(decision: string): boolean {
  return decision === "CLARIFICATION_REQUESTED";
}

// Maximum length of any comment body - enforced identically on the vendor
// portal and for internal reviewers.
export const COMMENT_MAX_LENGTH = 2000;
