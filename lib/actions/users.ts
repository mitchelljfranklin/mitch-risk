"use server";

import { revalidatePath } from "next/cache";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  changeUserRole,
  countUsersWithPermission,
  createUser,
  resetUserPassword,
  toggleUserDisabled,
} from "@/lib/db/users";
import { getRole } from "@/lib/db/roles";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/actions/helpers";
import { prisma } from "@/lib/prisma";

export type UserActionState = { ok: boolean; message: string } | undefined;

export async function addUserAction(
  previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requirePermission(PERMISSIONS.USERS_MANAGE);

  const name = getField(formData, "name");
  const email = getField(formData, "email");
  const password = getField(formData, "password");
  const roleId = getField(formData, "roleId");

  if (!name || !email || !password || !roleId) {
    return {
      ok: false,
      message: "Name, email, password, and role are required.",
    };
  }

  const role = await getRole(roleId);
  if (!role) {
    return { ok: false, message: "Selected role does not exist." };
  }

  try {
    await createUser({ name, email, password, roleId });
  } catch {
    return { ok: false, message: "A user with this email already exists." };
  }

  const actor = await getCurrentUser();
  if (actor) {
    await logAudit(actor.id, "CREATE_USER", "User", email);
  }

  revalidatePath("/settings");
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
      disabled ? "DISABLE_USER" : "ENABLE_USER",
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
    await logAudit(actor.id, "CHANGE_ROLE", "User", userId, {
      newRoleId: roleId,
      newRole: role.name,
    });
  }
  revalidatePath("/settings");
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
    await logAudit(actor.id, "RESET_PASSWORD", "User", userId);
  }
  revalidatePath("/settings");
}
