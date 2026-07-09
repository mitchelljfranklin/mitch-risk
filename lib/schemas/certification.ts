import { z } from "zod";

export const certificationSchema = z.object({
  name: z.string().min(1, "Certification name is required"),
  issuer: z.string().optional(),
  issuedDate: z.string().optional(),
  expiresDate: z.string().min(1, "Expiry date is required"),
  notes: z.string().optional(),
});

export type CertificationInput = z.infer<typeof certificationSchema>;

export type CertificationStatus = "valid" | "expiring" | "expired";

const CERTIFICATION_EXPIRING_DAYS = 30;

export function certificationStatus(
  expiresDate: Date | string,
  now: Date = new Date(),
): CertificationStatus {
  const expiry =
    expiresDate instanceof Date ? expiresDate : new Date(expiresDate);
  if (expiry.getTime() < now.getTime()) {
    return "expired";
  }
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + CERTIFICATION_EXPIRING_DAYS);
  return expiry.getTime() <= threshold.getTime() ? "expiring" : "valid";
}

export const CERTIFICATION_STATUS_LABELS: Record<CertificationStatus, string> =
  {
    valid: "Valid",
    expiring: "Expiring soon",
    expired: "Expired",
  };

// Status colours are risk indicators, so the RAG palette is allowed here.
export const CERTIFICATION_STATUS_STYLES: Record<CertificationStatus, string> =
  {
    valid: "bg-[var(--rag-green)] text-white",
    expiring: "bg-[var(--rag-amber)] text-black",
    expired: "bg-[var(--rag-red)] text-white",
  };
