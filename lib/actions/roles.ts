"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Prisma } from "../../prisma/generated/prisma/client";
import { requirePermission, getCurrentUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import {
  createRole,
  deleteRole,
  duplicateRole,
  updateRole,
} from "@/lib/db/roles";
import { logAudit, AUDIT_ACTIONS } from "@/lib/db/audit";
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

function roleErrorKey(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "Role not found.":
      return "errors.notFound";
    case "The Admin role permissions cannot be changed.":
      return "errors.adminLocked";
    case "System roles cannot be deleted.":
      return "errors.systemCannotDelete";
    case "This role is assigned to one or more users. Reassign them before deleting.":
      return "errors.assignedUsers";
    default:
      return null;
  }
}

export async function createRoleAction(
  previousState: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);
  const translations = await getTranslations("Admin.roles");

  const parsed = parseRoleForm(formData);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    let messageKey = "errors.invalidInput";
    if (issue?.path[0] === "name") {
      messageKey =
        issue.code === "too_big" ? "errors.nameTooLong" : "errors.nameRequired";
    } else if (issue?.path[0] === "description") {
      messageKey = "errors.descriptionTooLong";
    }
    return { ok: false, message: translations(messageKey) };
  }

  try {
    const role = await createRole(parsed.data);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, AUDIT_ACTIONS.CREATE_ROLE, "Role", role.id);
    }
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, message: translations("errors.roleExists") };
    }
    return { ok: false, message: translations("errors.createFailed") };
  }

  // No revalidatePath here: this result is consumed by useActionState in a modal.
  // Revalidating the current route re-renders the modal and drops the returned
  // state in production builds. The client refreshes after closing instead.
  return { ok: true, message: translations("success") };
}

export async function updateRoleAction(
  previousState: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);
  const translations = await getTranslations("Admin.roles");

  const roleId = getField(formData, "roleId");
  if (!roleId) {
    return { ok: false, message: translations("errors.missingRole") };
  }

  const parsed = parseRoleForm(formData);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    let messageKey = "errors.invalidInput";
    if (issue?.path[0] === "name") {
      messageKey =
        issue.code === "too_big" ? "errors.nameTooLong" : "errors.nameRequired";
    } else if (issue?.path[0] === "description") {
      messageKey = "errors.descriptionTooLong";
    }
    return { ok: false, message: translations(messageKey) };
  }

  try {
    await updateRole(roleId, parsed.data);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, AUDIT_ACTIONS.UPDATE_ROLE, "Role", roleId);
    }
  } catch (error: unknown) {
    const messageKey = roleErrorKey(error);
    return {
      ok: false,
      message: messageKey
        ? translations(messageKey)
        : translations("errors.updateFailed"),
    };
  }

  // See createRoleAction: the client refreshes after closing the modal.
  return { ok: true, message: translations("updated") };
}

export async function duplicateRoleAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);
  const translations = await getTranslations("Admin.roles");

  const roleId = getField(formData, "roleId");
  if (!roleId) {
    return;
  }

  try {
    const role = await duplicateRole(roleId);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, AUDIT_ACTIONS.DUPLICATE_ROLE, "Role", role.id, {
        sourceRoleId: roleId,
      });
    }
    revalidatePath("/admin/roles");
  } catch (error: unknown) {
    console.error(
      `[roles] failed to duplicate role ${roleId}:`,
      error instanceof Error ? error.message : String(error),
    );
    // Surface the failure - without this the admin sees a dead button.
    const messageKey = roleErrorKey(error);
    let reason: string;
    if (messageKey) {
      reason = translations(messageKey);
    } else if (error instanceof Error) {
      reason = error.message;
    } else {
      reason = translations("errors.invalidInput");
    }
    redirect(
      `/admin/roles?roleError=${encodeURIComponent(
        translations("errors.duplicateFailed", { reason }),
      )}`,
    );
  }
}

export async function deleteRoleAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);
  const translations = await getTranslations("Admin.roles");

  const roleId = getField(formData, "roleId");
  if (!roleId) {
    return;
  }

  try {
    await deleteRole(roleId);
    const actor = await getCurrentUser();
    if (actor) {
      await logAudit(actor.id, AUDIT_ACTIONS.DELETE_ROLE, "Role", roleId);
    }
    revalidatePath("/admin/roles");
  } catch (error: unknown) {
    console.error(
      `[roles] failed to delete role ${roleId}:`,
      error instanceof Error ? error.message : String(error),
    );
    const messageKey = roleErrorKey(error);
    let reason: string;
    if (messageKey) {
      reason = translations(messageKey);
    } else if (error instanceof Error) {
      reason = error.message;
    } else {
      reason = translations("errors.invalidInput");
    }
    redirect(
      `/admin/roles?roleError=${encodeURIComponent(
        translations("errors.deleteFailed", { reason }),
      )}`,
    );
  }
}
