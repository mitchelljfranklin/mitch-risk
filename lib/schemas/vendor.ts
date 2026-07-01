import { z } from "zod";

export const VENDOR_TIERS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const VENDOR_TIER_LABELS: Record<(typeof VENDOR_TIERS)[number], string> =
  {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
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
});

export type VendorInput = z.infer<typeof vendorSchema>;

export const vendorCsvRowSchema = z.object({
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
});

export type VendorCsvRow = z.infer<typeof vendorCsvRowSchema>;
