import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createRole,
  deleteRole,
  ensureSystemRoles,
  getRoleByName,
  updateRole,
} from "@/lib/db/roles";
import { createUser } from "@/lib/db/users";
import { PERMISSIONS, SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const CUSTOM_ROLE_NAME = "Roles Test Custom";
const ASSIGNED_ROLE_NAME = "Roles Test Assigned";
const TEST_USER_EMAIL = "roles-test-user@example.test";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: TEST_USER_EMAIL } });
  await prisma.role.deleteMany({
    where: { name: { in: [CUSTOM_ROLE_NAME, ASSIGNED_ROLE_NAME] } },
  });
}

beforeAll(async () => {
  await cleanup();
  await ensureSystemRoles();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("role data access (integration)", () => {
  it("ensureSystemRoles is idempotent and keeps Admin at full permissions", async () => {
    await ensureSystemRoles();
    const admin = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
    expect(admin).not.toBeNull();
    expect(admin?.isSystem).toBe(true);
    expect(admin?.permissions).toContain(PERMISSIONS.SETTINGS_MANAGE);
    expect(admin?.permissions).toContain(PERMISSIONS.ROLES_MANAGE);
  });

  it("creates a custom role, dropping unknown permission keys", async () => {
    const role = await createRole({
      name: CUSTOM_ROLE_NAME,
      description: "custom",
      permissions: [PERMISSIONS.VENDORS_VIEW, "vendors:teleport"],
    });
    expect(role.isSystem).toBe(false);
    expect(role.permissions).toContain(PERMISSIONS.VENDORS_VIEW);
    expect(role.permissions).not.toContain("vendors:teleport");
  });

  it("updates a custom role's permissions", async () => {
    const role = await getRoleByName(CUSTOM_ROLE_NAME);
    if (!role) throw new Error("role not found");
    const updated = await updateRole(role.id, {
      name: CUSTOM_ROLE_NAME,
      description: "updated",
      permissions: [PERMISSIONS.VENDORS_VIEW, PERMISSIONS.ASSESSMENTS_VIEW],
    });
    expect(updated.permissions).toContain(PERMISSIONS.ASSESSMENTS_VIEW);
    expect(updated.description).toBe("updated");
  });

  it("refuses to edit the Admin role permissions", async () => {
    const admin = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
    if (!admin) throw new Error("admin role not found");
    await expect(
      updateRole(admin.id, {
        name: admin.name,
        description: admin.description ?? "",
        permissions: [PERMISSIONS.VENDORS_VIEW],
      }),
    ).rejects.toThrow();
  });

  it("refuses to delete a system role", async () => {
    const viewer = await getRoleByName(SYSTEM_ROLE_NAMES.VIEWER);
    if (!viewer) throw new Error("viewer role not found");
    await expect(deleteRole(viewer.id)).rejects.toThrow();
  });

  it("refuses to delete a role that still has users assigned", async () => {
    const role = await createRole({
      name: ASSIGNED_ROLE_NAME,
      permissions: [PERMISSIONS.VENDORS_VIEW],
    });
    await createUser({
      name: "Roles Test User",
      email: TEST_USER_EMAIL,
      password: "correct-horse-battery-staple",
      roleId: role.id,
    });

    await expect(deleteRole(role.id)).rejects.toThrow();

    await prisma.user.deleteMany({ where: { email: TEST_USER_EMAIL } });
    await deleteRole(role.id);
    expect(await getRoleByName(ASSIGNED_ROLE_NAME)).toBeNull();
  });
});
