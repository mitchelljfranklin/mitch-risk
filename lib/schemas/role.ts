import { z } from "zod";

export const roleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(50, "Role name must be 50 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(200, "Description must be 200 characters or fewer")
    .optional()
    .default(""),
  permissions: z.array(z.string()).default([]),
});

export type RoleInput = z.infer<typeof roleSchema>;
