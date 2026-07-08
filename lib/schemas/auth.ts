import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(12, "Use at least 12 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Enter a valid email address"),
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().optional().default(""),
    confirmNewPassword: z.string().optional().default(""),
  })
  .refine(
    (data) => {
      if (!data.newPassword || data.newPassword.length === 0) return true;
      return data.newPassword.length >= 12;
    },
    {
      message: "New password must be at least 12 characters",
      path: ["newPassword"],
    },
  )
  .refine(
    (data) => {
      if (!data.newPassword || data.newPassword.length === 0) return true;
      return data.newPassword === data.confirmNewPassword;
    },
    {
      message: "Passwords do not match",
      path: ["confirmNewPassword"],
    },
  );

export const profileNameSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const userCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(12, "Use at least 12 characters"),
  roleId: z.string().min(1, "Role is required"),
});

export const setupAdminSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(12, "Use at least 12 characters"),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
export type SetupAdminInput = z.infer<typeof setupAdminSchema>;
