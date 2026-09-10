import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function getField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shared calendar-day validator for YYYY-MM-DD inputs. Rejects rollovers
// like 2026-02-31 that JavaScript's Date parser silently normalises - used
// by every form that stores a date-only field as a UTC-midnight instant.
export function isValidIsoDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const asUtc = new Date(Date.UTC(year, month - 1, day));
  return (
    asUtc.getUTCFullYear() === year &&
    asUtc.getUTCMonth() === month - 1 &&
    asUtc.getUTCDate() === day
  );
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

// For true calendar-day values (due dates, expiry dates, renewal dates),
// which are stored as UTC-midnight instants. Rendering them through the
// runtime-local formatter shifted them a day for anyone west of UTC.
const utcDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  return dateFormatter.format(date);
}

export function formatDateUtc(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  return utcDateFormatter.format(date);
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
