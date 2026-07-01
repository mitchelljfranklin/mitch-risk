"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdmin, getCurrentUser } from "@/lib/auth";
import {
  changeUserRole,
  createUser,
  resetUserPassword,
  toggleUserDisabled,
} from "@/lib/db/users";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/actions/helpers";

export type UserActionState = { ok: boolean; message: string } | undefined;

export async function addUserAction(
  previousState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireAdmin();

  const name = getField(formData, "name");
  const email = getField(formData, "email");
  const password = getField(formData, "password");
  const role = (getField(formData, "role") || "REVIEWER") as UserRole;

  if (!name || !email || !password) {
    return { ok: false, message: "Name, email, and password are required." };
  }

  try {
    await createUser({ name, email, password, role: role as UserRole });
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

export async function toggleUserAction(formData: FormData) {
  await requireAdmin();
  const userId = getField(formData, "userId");
  const disabled = getField(formData, "disabled") === "true";
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
  await requireAdmin();
  const userId = getField(formData, "userId");
  const role = getField(formData, "role") as UserRole;
  await changeUserRole(userId, role);
  const actor = await getCurrentUser();
  if (actor) {
    await logAudit(actor.id, "CHANGE_ROLE", "User", userId, { newRole: role });
  }
  revalidatePath("/settings");
}

export async function resetPasswordAction(formData: FormData) {
  await requireAdmin();
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
