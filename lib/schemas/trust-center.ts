import { z } from "zod";

import { isValidIsoDateString } from "@/lib/utils";

// Shared rules for every optional calendar-day field in the trust center.
const optionalIsoDate = z
  .string()
  .refine((value) => value === "" || isValidIsoDateString(value), {
    message: "Enter a valid date",
  })
  .default("");

export const trustCenterBadgeSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  issuer: z.string().trim().max(120).default(""),
  description: z.string().trim().max(500).default(""),
  externalUrl: z.union([z.literal(""), z.url("Enter a valid URL")]).default(""),
  issuedDate: optionalIsoDate,
  expiresDate: optionalIsoDate,
  published: z.boolean().default(false),
});

export type TrustCenterBadgeInput = z.infer<typeof trustCenterBadgeSchema>;

export const TRUST_CENTER_DOCUMENT_CATEGORIES = [
  "POLICY",
  "SECURITY",
  "COMPLIANCE",
  "PRIVACY",
  "OTHER",
] as const;

export const TRUST_CENTER_DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  POLICY: "Policy",
  SECURITY: "Security report",
  COMPLIANCE: "Compliance",
  PRIVACY: "Privacy",
  OTHER: "Other",
};

export const trustCenterDocumentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(500).default(""),
  category: z.enum(TRUST_CENTER_DOCUMENT_CATEGORIES).default("OTHER"),
  published: z.boolean().default(false),
});

export type TrustCenterDocumentInput = z.infer<
  typeof trustCenterDocumentSchema
>;

export const trustCenterSubprocessorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  purpose: z.string().trim().max(500).default(""),
  location: z.string().trim().max(120).default(""),
  websiteUrl: z.union([z.literal(""), z.url("Enter a valid URL")]).default(""),
  published: z.boolean().default(false),
});

export type TrustCenterSubprocessorInput = z.infer<
  typeof trustCenterSubprocessorSchema
>;

export const trustCenterSectionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z
    .string()
    .max(10_000, "Section body is too long (max 10,000 characters)")
    .default(""),
  published: z.boolean().default(false),
});

export type TrustCenterSectionInput = z.infer<typeof trustCenterSectionSchema>;

// Badge images are served from a public route, so the same raster-only rules
// as the brand logo apply: no SVG, ever.
export const TRUST_CENTER_IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp"];
export const MAX_TRUST_CENTER_IMAGE_BYTES = 2 * 1024 * 1024;
