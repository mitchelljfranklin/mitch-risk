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

export const FINDING_STATUSES = [
  "OPEN",
  "REMEDIATED",
  "RISK_ACCEPTED",
] as const;

export const FINDING_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  REMEDIATED: "Remediated",
  RISK_ACCEPTED: "Risk accepted",
};

export const FINDING_STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-destructive text-white",
  REMEDIATED: "bg-success text-success-foreground",
  RISK_ACCEPTED: "bg-secondary text-secondary-foreground",
};

// Severity is a risk indicator, so it may use the RAG palette (per AGENTS).
export const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-[var(--rag-red)] text-white",
  HIGH: "bg-[var(--rag-amber)] text-black",
  MEDIUM: "bg-[var(--rag-amber)]/70 text-black",
  LOW: "bg-muted text-muted-foreground",
};

// Semantic Tailwind classes per status (chrome only — never the RAG palette).
export const ASSESSMENT_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-secondary text-secondary-foreground",
  IN_PROGRESS: "bg-secondary text-secondary-foreground",
  SUBMITTED: "bg-primary text-primary-foreground",
  UNDER_REVIEW: "bg-primary/80 text-primary-foreground",
  COMPLETED: "bg-success text-success-foreground",
};

export function isAssessmentOverdue(
  dueDate: Date | string | null | undefined,
  status: string,
): boolean {
  if (!dueDate) return false;
  if (status !== "SENT" && status !== "IN_PROGRESS") return false;
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  return due.getTime() < Date.now();
}
