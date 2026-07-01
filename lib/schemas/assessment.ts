import { z } from "zod";

export const assessmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  templateId: z.string().min(1, "Select a template"),
  dueDate: z.string().optional().default(""),
  reviewerId: z.string().optional().default(""),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;

export const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  COMPLETED: "Completed",
};

export const FINDING_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  ACCEPTED: "Accepted",
  REMEDIATED: "Remediated",
  RISK_ACCEPTED: "Risk accepted",
};
