import { z } from "zod";

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
  conditionQuestionId: z.string().optional().default(""),
  conditionEquals: z.string().optional().default(""),
  controlIds: z.array(z.string()).default([]),
});
export type QuestionInput = z.infer<typeof questionSchema>;
