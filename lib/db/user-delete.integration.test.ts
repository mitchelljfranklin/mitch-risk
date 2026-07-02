import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { logAudit } from "@/lib/db/audit";
import { countAdminsExcluding, createUser, deleteUser } from "@/lib/db/users";
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { PERMISSIONS, SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "p50-admin@example.test";
const VIEWER_EMAIL = "p50-viewer@example.test";

async function cleanup() {
  await prisma.user.deleteMany({
    where: { email: { in: [ADMIN_EMAIL, VIEWER_EMAIL] } },
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

describe("user delete (integration)", () => {
  it("keeps audit logs with a null user after the author is deleted", async () => {
    const viewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.VIEWER);
    if (!viewerRole) throw new Error("viewer role missing");

    const user = await createUser({
      name: "P50 Viewer",
      email: VIEWER_EMAIL,
      password: "correct-horse-battery-staple",
      roleId: viewerRole.id,
    });
    const audit = await logAudit(user.id, "LOGIN");

    await deleteUser(user.id);

    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    const preserved = await prisma.auditLog.findUnique({
      where: { id: audit.id },
    });
    expect(preserved).not.toBeNull();
    expect(preserved?.userId).toBeNull();
  });

  it("countAdminsExcluding counts other users with the permission", async () => {
    const adminRole = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
    if (!adminRole) throw new Error("admin role missing");

    const admin = await createUser({
      name: "P50 Admin",
      email: ADMIN_EMAIL,
      password: "correct-horse-battery-staple",
      roleId: adminRole.id,
    });

    const othersBefore = await countAdminsExcluding(
      admin.id,
      PERMISSIONS.SETTINGS_MANAGE,
    );
    // There is at least one real admin in the dev DB besides this test admin.
    expect(othersBefore).toBeGreaterThanOrEqual(1);

    // Excluding a non-admin does not change the admin count meaningfully.
    const selfExcluded = await countAdminsExcluding(
      admin.id,
      PERMISSIONS.SETTINGS_MANAGE,
    );
    expect(selfExcluded).toBe(othersBefore);
  });
});
