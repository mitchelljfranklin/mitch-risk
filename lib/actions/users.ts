"use server";

import { revalidatePath } from "next/cache";

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

  const parsed = userCreateSchema.safeParse({
    name: getField(formData, "name"),
    email: getField(formData, "email"),
    password: getField(formData, "password"),
    roleId: getField(formData, "roleId"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const role = await getRole(parsed.data.roleId);
  if (!role) {
    return { ok: false, message: "Selected role does not exist." };
  }

  try {
    await createUser(parsed.data);
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, message: "A user with this email already exists." };
    }
    console.error(
      `[users] failed to create user ${parsed.data.email}:`,
      error instanceof Error ? error.message : String(error),
    );
    return {
      ok: false,
      message: "Could not create the user. Please try again.",
    };
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
  return { ok: true, message: "User created." };
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
  revalidatePath("/settings");
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
  revalidatePath("/settings");
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
  revalidatePath("/settings");
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
  revalidatePath("/settings");
}
