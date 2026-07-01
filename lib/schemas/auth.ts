import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const setupAdminSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(12, "Use at least 12 characters"),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
export type SetupAdminInput = z.infer<typeof setupAdminSchema>;
