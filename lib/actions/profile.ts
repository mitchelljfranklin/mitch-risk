"use server";

import bcrypt from "bcryptjs";
import { getTranslations } from "next-intl/server";
import { type Prisma } from "../../prisma/generated/prisma/client";

import { getCurrentUser, requirePermission, signOut } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  findUserByEmail,
  hasLocalPassword,
  resetUserPassword,
} from "@/lib/db/users";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { prisma } from "@/lib/prisma";
import { profileNameSchema, profileUpdateSchema } from "@/lib/schemas/auth";

export type ProfileState = { ok: boolean; message: string } | undefined;

export async function updateProfileAction(
  previousState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  await requirePermission(PERMISSIONS.PROFILE_VIEW);
  const translations = await getTranslations("Profile");
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: translations("errors.notAuthenticated") };
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!existing) {
    return { ok: false, message: translations("errors.accountNotFound") };
  }

  // SSO-only accounts have no local password; their credentials (and email) are
  // managed by the identity provider. Allow updating the display name only.
  if (!hasLocalPassword(existing.passwordHash)) {
    const parsedName = profileNameSchema.safeParse({
      name: formData.get("name"),
    });
    if (!parsedName.success) {
      const nameIssue = parsedName.error.issues[0];
      return {
        ok: false,
        message:
          nameIssue?.path[0] === "name"
            ? translations("errors.nameRequired")
            : translations("errors.invalidInput"),
      };
    }

    if (parsedName.data.name !== user.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: parsedName.data.name },
      });
      await logAudit(user.id, AUDIT_ACTIONS.UPDATE_PROFILE);
    }

    // Result feeds useActionState; the client refreshes (useActionFeedback)
    // rather than revalidating the current route, which drops the toast in prod.
    return { ok: true, message: translations("errors.success") };
  }

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    let messageKey = "errors.invalidInput";
    if (issue?.path[0] === "name") messageKey = "errors.nameRequired";
    else if (issue?.path[0] === "email") messageKey = "errors.emailInvalid";
    else if (issue?.path[0] === "currentPassword") {
      messageKey = "errors.currentPasswordRequired";
    } else if (issue?.path[0] === "newPassword") {
      messageKey = "errors.passwordTooShort";
    } else if (issue?.path[0] === "confirmNewPassword") {
      messageKey = "errors.passwordMismatch";
    }
    return { ok: false, message: translations(messageKey) };
  }

  const { name, email, currentPassword, newPassword } = parsed.data;

  // Verify current password.
  if (!(await bcrypt.compare(currentPassword, existing.passwordHash))) {
    return {
      ok: false,
      message: translations("errors.currentPasswordIncorrect"),
    };
  }

  // Update name/email if changed.
  const updates: Record<string, unknown> = {};
  if (name !== user.name) updates.name = name;
  if (email.toLowerCase() !== user.email?.toLowerCase()) {
    const duplicate = await findUserByEmail(email);
    if (duplicate && duplicate.id !== user.id) {
      return { ok: false, message: translations("errors.emailTaken") };
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

  await logAudit(user.id, AUDIT_ACTIONS.UPDATE_PROFILE);

  // If email changed, sign out so the session picks up the new email.
  if (updates.email) {
    await signOut({ redirectTo: "/login?updated=1" });
  }

  // See above: the client refreshes rather than revalidating the current route.
  return { ok: true, message: translations("errors.success") };
}
