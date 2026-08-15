import { z } from "zod";

import { CONDITION_OPERATORS } from "@/lib/portal";

export const QUESTION_TYPES = [
  "YES_NO",
  "MULTIPLE_CHOICE",
  "FREE_TEXT",
  "FILE_UPLOAD",
  "DATE",
  "NUMERIC",
  "COMBOBOX",
  "MULTI_SELECT",
  "RATING",
  "URL",
  "EMAIL",
  "CHECKBOX",
] as const;

export const RISK_WEIGHTS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export const QUESTION_TYPE_LABELS: Record<
  (typeof QUESTION_TYPES)[number],
  string
> = {
  YES_NO: "Yes / No",
  MULTIPLE_CHOICE: "Single choice (pick one)",
  FREE_TEXT: "Free text",
  FILE_UPLOAD: "File upload",
  DATE: "Date",
  NUMERIC: "Numeric",
  COMBOBOX: "Combobox",
  MULTI_SELECT: "Multi‑select (pick many)",
  RATING: "Rating (1‑5)",
  URL: "URL",
  EMAIL: "Email",
  CHECKBOX: "Checkbox (acknowledgment)",
};

export const RISK_WEIGHT_LABELS: Record<(typeof RISK_WEIGHTS)[number], string> =
  {
    CRITICAL: "Critical",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  };

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional().default(""),
});
export type TemplateInput = z.infer<typeof templateSchema>;

export const sectionSchema = z.object({
  title: z.string().min(1, "Section title is required"),
});
export type SectionInput = z.infer<typeof sectionSchema>;

export const conditionRuleSchema = z.object({
  questionId: z.string().min(1),
  operator: z.enum(CONDITION_OPERATORS),
  value: z.string().optional().default(""),
});

export const conditionalLogicSchema = z.object({
  match: z.enum(["all", "any"]).default("all"),
  rules: z.array(conditionRuleSchema).default([]),
});
export type ConditionalLogicInput = z.infer<typeof conditionalLogicSchema>;

export const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  helpText: z.string().optional().default(""),
  type: z.enum(QUESTION_TYPES),
  riskWeight: z.enum(RISK_WEIGHTS).default("MEDIUM"),
  required: z.boolean().default(true),
  options: z.array(z.string().min(1)).default([]),
  expectedAnswer: z
    .union([z.string(), z.number(), z.array(z.string())])
    .optional()
    .default(""),
  conditionalLogic: conditionalLogicSchema.default({ match: "all", rules: [] }),
  controlIds: z.array(z.string()).default([]),
});
export type QuestionInput = z.infer<typeof questionSchema>;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export function validateExpectedAnswer(
  type: QuestionType,
  value: unknown,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (type === "MULTI_SELECT") {
    if (
      !Array.isArray(value) ||
      value.some((entry) => typeof entry !== "string")
    ) {
      return "MULTI_SELECT expectedAnswer must be an array of strings.";
    }
    return null;
  }
  if (type === "MULTIPLE_CHOICE" || type === "COMBOBOX") {
    if (typeof value === "string") {
      return null;
    }
    if (
      Array.isArray(value) &&
      value.every((entry) => typeof entry === "string")
    ) {
      return null;
    }
    return `${type} expectedAnswer must be a string or an array of strings.`;
  }
  if (type === "NUMERIC" || type === "RATING") {
    if (typeof value !== "number") {
      return "NUMERIC/RATING expectedAnswer must be a number.";
    }
    return null;
  }
  if (type === "YES_NO" || type === "CHECKBOX") {
    if (typeof value !== "string") {
      return `${type} expectedAnswer must be a string.`;
    }
    return null;
  }
  return null;
}

export function normalizeExpectedAnswerForEditor(
  value: unknown,
): string | number | string[] {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  return String(value);
}
