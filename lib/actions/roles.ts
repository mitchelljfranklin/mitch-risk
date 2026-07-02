"use server";

import { revalidatePath } from "next/cache";

import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createRole, deleteRole, updateRole } from "@/lib/db/roles";
import { logAudit } from "@/lib/db/audit";
import { getField } from "@/lib/actions/helpers";
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
  } catch {
    return { ok: false, message: "A role with this name already exists." };
  }

  revalidatePath("/settings");
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

  revalidatePath("/settings");
  return { ok: true, message: "Role updated." };
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
  } catch {
    return;
  }

  revalidatePath("/settings");
}
