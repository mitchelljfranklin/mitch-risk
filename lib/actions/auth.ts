"use server";

import { signOut } from "@/lib/auth";
import {
  createPasswordResetToken,
  consumeResetToken,
  findUserByEmail,
  resetUserPassword,
} from "@/lib/db/users";
import { sendEmail } from "@/lib/email/mailer";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/schemas/auth";
import { getOrganizationSettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export type ForgotPasswordState = { ok: boolean; message: string } | undefined;

export async function sendResetEmailAction(
  previousState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid email.",
    };
  }

  const { email } = parsed.data;

  // Rate-limit to 1 attempt per 5 minutes per email.
  if (!rateLimit("resetPassword", email.toLowerCase(), 1)) {
    return {
      ok: true,
      message:
        "If an account with that email exists, a reset link has already been sent recently.",
    };
  }

  const user = await findUserByEmail(email);
  if (!user) {
    // Silent — don't leak account existence.
    return {
      ok: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
    };
  }

  const token = await createPasswordResetToken(user.id);
  const org = await getOrganizationSettings();
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;

  await sendEmail(email, "reset", {
    appName: org.name,
    resetUrl,
    expiresIn: "1 hour",
  });

  return {
    ok: true,
    message:
      "If an account with that email exists, a reset link has been sent.",
  };
}

export type ResetPasswordState = { ok: boolean; message: string } | undefined;

export async function resetPasswordAction(
  previousState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = formData.get("token") as string;
  if (!token) {
    return { ok: false, message: "Invalid reset link." };
  }

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid password.",
    };
  }

  const userId = await consumeResetToken(token);
  if (!userId) {
    return { ok: false, message: "This reset link is invalid or has expired." };
  }

  await resetUserPassword(userId, parsed.data.password);
  redirect("/login?reset=1");
}
