"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createRole,
  deleteRole,
  duplicateRole,
  updateRole,
} from "@/lib/db/roles";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/utils";
import { roleSchema } from "@/lib/schemas/role";

export type RoleActionState = { ok: boolean; message: string } | undefined;

function parseRoleForm(formData: FormData) {
  return roleSchema.safeParse({
    name: getField(formData, "name"),
    description: getField(formData, "description"),
    permissions: formData.getAll("permissions").map(String),
  });
}

export async function createRoleAction(
  previousState: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);

  const parsed = parseRoleForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const role = await createRole(parsed.data);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, "CREATE_ROLE", "Role", role.id);
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, message: "A role with this name already exists." };
    }
    throw error;
  }

  // No revalidatePath here: this result is consumed by useActionState in a modal.
  // Revalidating the current route re-renders the modal and drops the returned
  // state in production builds. The client refreshes after closing instead.
  return { ok: true, message: "Role created." };
}

export async function updateRoleAction(
  previousState: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);

  const roleId = getField(formData, "roleId");
  if (!roleId) {
    return { ok: false, message: "Missing role." };
  }

  const parsed = parseRoleForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    await updateRole(roleId, parsed.data);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, "UPDATE_ROLE", "Role", roleId);
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not update the role.",
    };
  }

  // See createRoleAction: the client refreshes after closing the modal.
  return { ok: true, message: "Role updated." };
}

export async function duplicateRoleAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);

  const roleId = getField(formData, "roleId");
  if (!roleId) {
    return;
  }

  try {
    const role = await duplicateRole(roleId);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, "DUPLICATE_ROLE", "Role", role.id, {
        sourceRoleId: roleId,
      });
    }
  } catch (error) {
    console.error(`[roles] failed to duplicate role ${roleId}:`, error);
    return;
  }

  revalidatePath("/settings");
}

export async function deleteRoleAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);

  const roleId = getField(formData, "roleId");
  if (!roleId) {
    return;
  }

  try {
    await deleteRole(roleId);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, "DELETE_ROLE", "Role", roleId);
    }
  } catch (error) {
    console.error(`[roles] failed to delete role ${roleId}:`, error);
    return;
  }

  revalidatePath("/settings");
}
