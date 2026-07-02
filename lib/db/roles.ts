import { type Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  SYSTEM_ROLE_DEFINITIONS,
  SYSTEM_ROLE_NAMES,
  isValidPermission,
} from "@/lib/permissions";

export type RoleWithUserCount = Role & { _count: { users: number } };

export function listRoles() {
  return prisma.role.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    include: { _count: { select: { users: true } } },
  });
}

export function getRole(id: string) {
  return prisma.role.findUnique({ where: { id } });
}

export function getRoleByName(name: string) {
  return prisma.role.findUnique({ where: { name } });
}

export function countUsersInRole(roleId: string): Promise<number> {
  return prisma.user.count({ where: { roleId } });
}

function sanitizePermissions(permissions: string[]): string[] {
  return [...new Set(permissions.filter(isValidPermission))];
}

export async function createRole(input: {
  name: string;
  description?: string;
  permissions: string[];
}): Promise<Role> {
  return prisma.role.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      permissions: sanitizePermissions(input.permissions),
      isSystem: false,
    },
  });
}

export async function updateRole(
  id: string,
  input: { name: string; description?: string; permissions: string[] },
): Promise<Role> {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) {
    throw new Error("Role not found.");
  }

  if (role.isSystem && role.name === SYSTEM_ROLE_NAMES.ADMIN) {
    throw new Error("The Admin role permissions cannot be changed.");
  }

  return prisma.role.update({
    where: { id },
    data: {
      name: role.isSystem ? role.name : input.name.trim(),
      description: input.description?.trim() || null,
      permissions: sanitizePermissions(input.permissions),
    },
  });
}

export async function deleteRole(id: string): Promise<void> {
  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!role) {
    throw new Error("Role not found.");
  }
  if (role.isSystem) {
    throw new Error("System roles cannot be deleted.");
  }
  if (role._count.users > 0) {
    throw new Error(
      "This role is assigned to one or more users. Reassign them before deleting.",
    );
  }

  await prisma.role.delete({ where: { id } });
}

export async function duplicateRole(id: string): Promise<Role> {
  const source = await prisma.role.findUnique({ where: { id } });
  if (!source) {
    throw new Error("Role not found.");
  }

  const baseName = `${source.name} (copy)`;
  let candidate = baseName;
  let attempt = 2;
  // Names are unique; find the first free "(copy)", "(copy 2)", ... variant.
  while (await prisma.role.findUnique({ where: { name: candidate } })) {
    candidate = `${source.name} (copy ${attempt})`;
    attempt += 1;
  }

  return prisma.role.create({
    data: {
      name: candidate,
      description: source.description,
      permissions: sanitizePermissions(source.permissions),
      isSystem: false,
    },
  });
}

export async function ensureSystemRoles(): Promise<void> {
  for (const definition of SYSTEM_ROLE_DEFINITIONS) {
    await prisma.role.upsert({
      where: { name: definition.name },
      update: {
        description: definition.description,
        permissions: [...definition.permissions],
        isSystem: true,
      },
      create: {
        name: definition.name,
        description: definition.description,
        permissions: [...definition.permissions],
        isSystem: true,
      },
    });
  }
}
