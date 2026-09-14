import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  convergeSystemRolePermissions,
  createRole,
  deleteRole,
  duplicateRole,
  ensureSystemRoles,
  getRoleByName,
  updateRole,
} from "@/lib/db/roles";
import { createUser } from "@/lib/db/users";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  SYSTEM_ROLE_DEFINITIONS,
  SYSTEM_ROLE_NAMES,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const CUSTOM_ROLE_NAME = "Roles Test Custom";
const CONVERGENCE_CUSTOM_ROLE_NAME = "Roles Test Convergence Custom";
const ASSIGNED_ROLE_NAME = "Roles Test Assigned";
const TEST_USER_EMAIL = "[EMAIL]";

async function cleanup() {
  // createUser lowercases emails on write, so match case-insensitively —
  // an exact match silently strands the user and blocks role cleanup with
  // foreign-key violations on every subsequent run.
  await prisma.user.deleteMany({
    where: { email: { equals: TEST_USER_EMAIL, mode: "insensitive" } },
  });
  await prisma.role.deleteMany({
    where: {
      OR: [
        {
          name: {
            in: [
              CUSTOM_ROLE_NAME,
              CONVERGENCE_CUSTOM_ROLE_NAME,
              ASSIGNED_ROLE_NAME,
            ],
          },
        },
        { name: { startsWith: `${CUSTOM_ROLE_NAME} (copy` } },
      ],
    },
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

  it("duplicates a role with a unique (copy) name and no system flag", async () => {
    const source = await getRoleByName(CUSTOM_ROLE_NAME);
    if (!source) throw new Error("source role not found");

    const first = await duplicateRole(source.id);
    expect(first.name).toBe(`${CUSTOM_ROLE_NAME} (copy)`);
    expect(first.isSystem).toBe(false);
    expect([...first.permissions].sort()).toEqual(
      [...source.permissions].sort(),
    );

    const second = await duplicateRole(source.id);
    expect(second.name).toBe(`${CUSTOM_ROLE_NAME} (copy 2)`);
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

    await prisma.user.deleteMany({
      where: { email: { equals: TEST_USER_EMAIL, mode: "insensitive" } },
    });
    await deleteRole(role.id);
    expect(await getRoleByName(ASSIGNED_ROLE_NAME)).toBeNull();
  });
});

describe("system role permission convergence (integration)", () => {
  // All tests run against the system roles, which are shared with every
  // other suite, so each test restores the shipped definitions before it
  // finishes and the afterAll converges everything back to defaults.
  beforeEach(async () => {
    await ensureSystemRoles();
  });

  afterAll(async () => {
    await convergeSystemRolePermissions();
    await cleanup();
    await prisma.$disconnect();
  });

  it("converges a pre-1.4 Admin to the full catalog (Trust Center fix)", async () => {
    const admin = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
    if (!admin) throw new Error("admin role not found");

    // Simulate a database last seeded before trustcenter:manage existed.
    await prisma.role.update({
      where: { id: admin.id },
      data: {
        permissions: admin.permissions.filter(
          (permission) => permission !== PERMISSIONS.TRUSTCENTER_MANAGE,
        ),
      },
    });

    await convergeSystemRolePermissions();

    const converged = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
    expect([...(converged?.permissions ?? [])].sort()).toEqual(
      [...ALL_PERMISSIONS].sort(),
    );
  });

  it("is additive-only: a key removed from Reviewer but kept on Admin stays removed", async () => {
    const reviewer = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
    if (!reviewer) throw new Error("reviewer role not found");

    await prisma.role.update({
      where: { id: reviewer.id },
      data: {
        permissions: reviewer.permissions.filter(
          (permission) =>
            permission !== PERMISSIONS.VENDORS_DELETE &&
            permission !== PERMISSIONS.ASSESSMENTS_VIEW,
        ),
      },
    });

    await convergeSystemRolePermissions();

    const after = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
    // vendors:delete exists on Admin — deliberate removal must survive.
    expect(after?.permissions).not.toContain(PERMISSIONS.VENDORS_DELETE);
    // assessments:view is also on Admin, so it counts as "known" — the
    // removal must survive here too.
    expect(after?.permissions).not.toContain(PERMISSIONS.ASSESSMENTS_VIEW);
  });

  it("grants Reviewer and Viewer keys that are genuinely new to the database", async () => {
    // Simulate: the database has never seen trustcenter:manage anywhere —
    // remove it from every system role (Reviewer/Viewer don't ship it by
    // default; drop it from Admin too so it counts as "new").
    const definitions = new Map(
      SYSTEM_ROLE_DEFINITIONS.map((definition) => [
        definition.name,
        definition.permissions,
      ]),
    );
    for (const [name] of definitions) {
      const role = await getRoleByName(name);
      if (!role) continue;
      await prisma.role.update({
        where: { id: role.id },
        data: {
          permissions: role.permissions.filter(
            (permission) => permission !== PERMISSIONS.TRUSTCENTER_MANAGE,
          ),
        },
      });
    }

    await convergeSystemRolePermissions();

    const admin = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
    expect(admin?.permissions).toContain(PERMISSIONS.TRUSTCENTER_MANAGE);
  });

  it("leaves custom roles untouched", async () => {
    const custom = await createRole({
      name: CONVERGENCE_CUSTOM_ROLE_NAME,
      description: "custom",
      permissions: [PERMISSIONS.VENDORS_VIEW],
    });

    await convergeSystemRolePermissions();

    const reloaded = await getRoleByName(custom.name);
    expect(reloaded?.permissions).toEqual([PERMISSIONS.VENDORS_VIEW]);
    await deleteRole(custom.id);
  });

  it("is idempotent — a second run changes nothing", async () => {
    await convergeSystemRolePermissions();
    const first = await Promise.all(
      SYSTEM_ROLE_DEFINITIONS.map(async (definition) => ({
        name: definition.name,
        permissions: (await getRoleByName(definition.name))?.permissions ?? [],
      })),
    );

    await convergeSystemRolePermissions();

    for (const role of first) {
      const reloaded = await getRoleByName(role.name);
      expect([...(reloaded?.permissions ?? [])].sort()).toEqual(
        [...role.permissions].sort(),
      );
    }
  });

  it("creates missing system roles from their definitions", async () => {
    const reviewer = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
    if (!reviewer) throw new Error("reviewer role not found");

    // Users block role deletion (FK). Park them on Admin for the moment;
    // convergence recreates Reviewer and they are moved back afterwards.
    const assignedUsers = await prisma.user.findMany({
      where: { roleId: reviewer.id },
      select: { id: true },
    });
    const admin = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
    if (!admin) throw new Error("admin role not found");
    await prisma.user.updateMany({
      where: { roleId: reviewer.id },
      data: { roleId: admin.id },
    });

    try {
      await prisma.role.delete({ where: { id: reviewer.id } });

      await convergeSystemRolePermissions();

      const recreated = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
      expect(recreated).not.toBeNull();
      expect(recreated?.isSystem).toBe(true);
      const reviewerDefinition = SYSTEM_ROLE_DEFINITIONS.find(
        (definition) => definition.name === SYSTEM_ROLE_NAMES.REVIEWER,
      );
      expect([...(recreated?.permissions ?? [])].sort()).toEqual(
        [...(reviewerDefinition?.permissions ?? [])].sort(),
      );
    } finally {
      // Restore the parked users onto whichever Reviewer role now exists.
      const restoredReviewer = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
      if (restoredReviewer) {
        await prisma.user.updateMany({
          where: { id: { in: assignedUsers.map((user) => user.id) } },
          data: { roleId: restoredReviewer.id },
        });
      }
    }
  });
});
