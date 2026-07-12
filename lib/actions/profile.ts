"use server";

import bcrypt from "bcryptjs";
import { type Prisma } from "../../prisma/generated/prisma/client";

import { getCurrentUser, signOut } from "@/lib/auth";
import {
  findUserByEmail,
  hasLocalPassword,
  resetUserPassword,
} from "@/lib/db/users";
import { logAudit } from "@/lib/db/audit";
import { prisma } from "@/lib/prisma";
import { profileNameSchema, profileUpdateSchema } from "@/lib/schemas/auth";

export type ProfileState = { ok: boolean; message: string } | undefined;

export async function updateProfileAction(
  previousState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Not authenticated." };
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!existing) {
    return { ok: false, message: "Account not found." };
  }

  // SSO-only accounts have no local password; their credentials (and email) are
  // managed by the identity provider. Allow updating the display name only.
  if (!hasLocalPassword(existing.passwordHash)) {
    const parsedName = profileNameSchema.safeParse({
      name: formData.get("name"),
    });
    if (!parsedName.success) {
      return {
        ok: false,
        message: parsedName.error.issues[0]?.message ?? "Invalid input.",
      };
    }

    if (parsedName.data.name !== user.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: parsedName.data.name },
      });
      await logAudit(user.id, "UPDATE_PROFILE");
    }

    // Result feeds useActionState; the client refreshes (useActionFeedback)
    // rather than revalidating the current route, which drops the toast in prod.
    return { ok: true, message: "Profile updated." };
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
  if (!(await bcrypt.compare(currentPassword, existing.passwordHash))) {
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
      data: updates as Prisma.UserUpdateInput,
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

  // See above: the client refreshes rather than revalidating the current route.
  return { ok: true, message: "Profile updated." };
}
