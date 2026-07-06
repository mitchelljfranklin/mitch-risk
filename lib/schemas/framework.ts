import { z } from "zod";

export const frameworkCsvRowSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  code: z.string().min(1, "Control code is required"),
  title: z.string().min(1, "Control title is required"),
  guidance: z.string().optional().default(""),
});

export type FrameworkCsvRow = z.infer<typeof frameworkCsvRowSchema>;

export const frameworkImportSchema = z.object({
  name: z.string().min(1, "Framework name is required").max(200),
  version: z.string().min(1, "Version is required").max(50),
  description: z.string().max(500).optional().default(""),
});

export type FrameworkImport = z.infer<typeof frameworkImportSchema>;
