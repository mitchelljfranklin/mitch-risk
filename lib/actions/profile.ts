"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { getCurrentUser, signOut } from "@/lib/auth";
import { findUserByEmail, resetUserPassword } from "@/lib/db/users";
import { logAudit } from "@/lib/db/audit";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/schemas/auth";

export type ProfileState = { ok: boolean; message: string } | undefined;

export async function updateProfileAction(
  previousState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Not authenticated." };
  }

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { name, email, currentPassword, newPassword } = parsed.data;

  // Verify current password.
  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (
    !existing ||
    !(await bcrypt.compare(currentPassword, existing.passwordHash))
  ) {
    return { ok: false, message: "Current password is incorrect." };
  }

  // Update name/email if changed.
  const updates: Record<string, unknown> = {};
  if (name !== user.name) updates.name = name;
  if (email.toLowerCase() !== user.email?.toLowerCase()) {
    const duplicate = await findUserByEmail(email);
    if (duplicate && duplicate.id !== user.id) {
      return { ok: false, message: "This email is already taken." };
    }
    updates.email = email.toLowerCase();
  }

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: updates as never,
    });
  }

  // Update password if provided.
  if (newPassword && newPassword.length > 0) {
    await resetUserPassword(user.id, newPassword);
  }

  await logAudit(user.id, "UPDATE_PROFILE");

  // If email changed, sign out so the session picks up the new email.
  if (updates.email) {
    await signOut({ redirectTo: "/login?updated=1" });
  }

  revalidatePath("/profile");
  return { ok: true, message: "Profile updated." };
}
