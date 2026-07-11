import { z } from "zod";

export const VENDOR_TIERS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const VENDOR_TIER_LABELS: Record<(typeof VENDOR_TIERS)[number], string> =
  {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  };

export const DATA_SENSITIVITIES = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
] as const;

export const DATA_SENSITIVITY_LABELS: Record<
  (typeof DATA_SENSITIVITIES)[number],
  string
> = {
  PUBLIC: "Public",
  INTERNAL: "Internal",
  CONFIDENTIAL: "Confidential",
  RESTRICTED: "Restricted",
};

export const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  contactName: z.string().optional().default(""),
  contactEmail: z.email("Enter a valid contact email"),
  tier: z
    .union([z.literal(""), z.enum(VENDOR_TIERS)])
    .optional()
    .default(""),
  website: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  serviceDescription: z.string().optional(),
  dataSensitivity: z
    .union([z.literal(""), z.enum(DATA_SENSITIVITIES)])
    .optional(),
  contractRenewalDate: z.string().optional(),
  contractValue: z.string().optional(),
  geographicRisk: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ownerId: z.string().optional(),
});

export type VendorInput = z.infer<typeof vendorSchema>;

export const vendorCsvRowSchema = z.object({
  id: z.string().optional().default(""),
  name: z.string().min(1, "Vendor name is required"),
  contactName: z.string().optional().default(""),
  contactEmail: z.string().min(1, "Contact email is required"),
  tier: z
    .string()
    .optional()
    .default("")
    .transform((v) =>
      VENDOR_TIERS.includes(v.toUpperCase() as (typeof VENDOR_TIERS)[number])
        ? v.toUpperCase()
        : "",
    ),
  website: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  serviceDescription: z.string().optional().default(""),
  dataSensitivity: z
    .string()
    .optional()
    .default("")
    .transform((v) =>
      DATA_SENSITIVITIES.includes(
        v.toUpperCase() as (typeof DATA_SENSITIVITIES)[number],
      )
        ? v.toUpperCase()
        : "",
    ),
  contractRenewalDate: z
    .string()
    .optional()
    .default("")
    .transform((v) => (v && !Number.isNaN(Date.parse(v)) ? v : "")),
  contractValue: z.string().optional().default(""),
  geographicRisk: z.string().optional().default(""),
  tags: z.string().optional().default(""),
});

export type VendorCsvRow = z.infer<typeof vendorCsvRowSchema>;
