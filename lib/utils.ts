import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(ratio: number, fractionDigits = 0): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  return `${(clamped * 100).toFixed(fractionDigits)}%`;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  return dateFormatter.format(date);
}

export function formatResponseValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.length > 0 ? value : "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

/**
 * Tailwind text-colour class for a 0–1 compliance score using the RAG palette.
 * RAG tokens are reserved for score/compliance indicators (not UI chrome).
 */
export function ragTextClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-muted-foreground";
  if (score >= 0.85) return "text-[var(--rag-green)]";
  if (score >= 0.6) return "text-[var(--rag-amber)]";
  return "text-[var(--rag-red)]";
}
