"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  changeUserRole,
  countAdminsExcluding,
  countUsersWithPermission,
  createUser,
  deleteUser,
  getUserDeletionImpact,
  resetUserPassword,
  toggleUserDisabled,
} from "@/lib/db/users";
import { getRole } from "@/lib/db/roles";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { userCreateSchema } from "@/lib/schemas/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "../../prisma/generated/prisma/client";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export type UserActionState = { ok: boolean; message: string } | undefined;

export async function addUserAction(
  previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const translations = await getTranslations("Admin.users");

  const parsed = userCreateSchema.safeParse({
    name: getField(formData, "name"),
    email: getField(formData, "email"),
    password: getField(formData, "password"),
    roleId: getField(formData, "roleId"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    let messageKey = "errors.invalidInput";
    if (issue?.path[0] === "name") messageKey = "errors.nameRequired";
    else if (issue?.path[0] === "email") messageKey = "errors.emailInvalid";
    else if (issue?.path[0] === "password") {
      messageKey = "errors.passwordTooShort";
    } else if (issue?.path[0] === "roleId") {
      messageKey = "errors.roleRequired";
    }
    return { ok: false, message: translations(messageKey) };
  }

  const role = await getRole(parsed.data.roleId);
  if (!role) {
    return { ok: false, message: translations("errors.roleNotFound") };
  }

  try {
    await createUser(parsed.data);
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, message: translations("errors.emailExists") };
    }
    console.error(
      `[users] failed to create user ${parsed.data.email}:`,
      error instanceof Error ? error.message : String(error),
    );
    return { ok: false, message: translations("errors.createFailed") };
  }

  const actor = await getCurrentUser();
  if (actor) {
    await logAudit(
      actor.id,
      AUDIT_ACTIONS.CREATE_USER,
      "User",
      parsed.data.email,
    );
  }

  // Result is consumed by useActionState in a modal; the client refreshes after
  // closing (see useActionFeedback) rather than revalidating the current route.
  return { ok: true, message: translations("success") };
}

async function wouldRemoveLastAdmin(userId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      disabled: true,
      role: { select: { permissions: true } },
    },
  });
  if (!target || target.disabled) {
    return false;
  }
  if (!target.role.permissions.includes(PERMISSIONS.SETTINGS_MANAGE)) {
    return false;
  }
  const admins = await countUsersWithPermission(PERMISSIONS.SETTINGS_MANAGE);
  return admins <= 1;
}

export async function toggleUserAction(formData: FormData) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const userId = getField(formData, "userId");
  const disabled = getField(formData, "disabled") === "true";
  if (disabled && (await wouldRemoveLastAdmin(userId))) {
    return;
  }
  await toggleUserDisabled(userId, disabled);
  const actor = await getCurrentUser();
  if (actor) {
    await logAudit(
      actor.id,
      disabled ? AUDIT_ACTIONS.DISABLE_USER : AUDIT_ACTIONS.ENABLE_USER,
      "User",
      userId,
    );
  }
  revalidatePath("/admin/users");
}

export async function changeRoleAction(formData: FormData) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const userId = getField(formData, "userId");
  const roleId = getField(formData, "roleId");

  const role = await getRole(roleId);
  if (!role) {
    return;
  }

  if (
    !role.permissions.includes(PERMISSIONS.SETTINGS_MANAGE) &&
    (await wouldRemoveLastAdmin(userId))
  ) {
    return;
  }

  await changeUserRole(userId, roleId);
  const actor = await getCurrentUser();
  if (actor) {
    await logAudit(actor.id, AUDIT_ACTIONS.CHANGE_ROLE, "User", userId, {
      newRoleId: roleId,
      newRole: role.name,
    });
  }
  revalidatePath("/admin/users");
}

export async function deleteUserAction(formData: FormData) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const userId = getField(formData, "userId");
  if (!userId) {
    return;
  }

  const actor = await getCurrentUser();
  if (actor?.id === userId) {
    return;
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: { select: { permissions: true } } },
  });
  if (!target) {
    return;
  }

  if (target.role.permissions.includes(PERMISSIONS.SETTINGS_MANAGE)) {
    const otherAdmins = await countAdminsExcluding(
      userId,
      PERMISSIONS.SETTINGS_MANAGE,
    );
    if (otherAdmins === 0) {
      return;
    }
  }

  if (actor) {
    await logAudit(actor.id, AUDIT_ACTIONS.DELETE_USER, "User", userId, {
      email: target.email,
    });
  }
  await deleteUser(userId);
  revalidatePath("/admin/users");
}

export async function getUserDeletionImpactAction(formData: FormData) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const userId = getField(formData, "userId");
  if (!userId) return null;
  return getUserDeletionImpact(userId);
}

export async function resetPasswordAction(formData: FormData) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const userId = getField(formData, "userId");
  const password = getField(formData, "password");
  if (!password || password.length < 12) {
    return;
  }
  await resetUserPassword(userId, password);
  const actor = await getCurrentUser();
  if (actor) {
    await logAudit(actor.id, AUDIT_ACTIONS.RESET_PASSWORD, "User", userId);
  }
  revalidatePath("/admin/users");
}
