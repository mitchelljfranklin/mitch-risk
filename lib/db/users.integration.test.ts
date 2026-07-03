import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createUser,
  listStaffAccounts,
  verifyUserCredentials,
} from "@/lib/db/users";
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const testEmail = "phase0-integration@example.test";
const localEmail = "staff-local@example.test";
const ssoEmail = "staff-sso@example.test";

async function cleanupStaff() {
  await prisma.user.deleteMany({
    where: { email: { in: [testEmail, localEmail, ssoEmail] } },
  });
}

beforeAll(cleanupStaff);

afterAll(async () => {
  await cleanupStaff();
  await prisma.$disconnect();
});

describe("user credentials (integration)", () => {
  it("creates a user and verifies correct and incorrect passwords", async () => {
    await ensureSystemRoles();
    const adminRole = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
    if (!adminRole) throw new Error("admin role not found");

    const created = await createUser({
      name: "Phase 0 Tester",
      email: testEmail,
      password: "correct-horse-battery",
      roleId: adminRole.id,
    });
    expect(created.email).toBe(testEmail);
    expect(created.passwordHash).not.toBe("correct-horse-battery");

    const found = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);

    const valid = await verifyUserCredentials(
      testEmail,
      "correct-horse-battery",
    );
    expect(valid?.id).toBe(created.id);

    const invalid = await verifyUserCredentials(testEmail, "wrong-password");
    expect(invalid).toBeNull();
  });
});

describe("listStaffAccounts (integration)", () => {
  it("flags SSO vs local accounts and exposes the role name", async () => {
    await ensureSystemRoles();
    const reviewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
    if (!reviewerRole) throw new Error("reviewer role not found");

    const localUser = await createUser({
      name: "Local Staff",
      email: localEmail,
      password: "correct-horse-battery",
      roleId: reviewerRole.id,
    });

    const ssoUser = await prisma.user.create({
      data: {
        name: "SSO Staff",
        email: ssoEmail,
        passwordHash: "",
        roleId: reviewerRole.id,
        ssoIdentities: {
          create: { provider: "oidc", providerId: "sso-staff-123" },
        },
      },
    });

    const accounts = await listStaffAccounts();
    const local = accounts.find((account) => account.id === localUser.id);
    const sso = accounts.find((account) => account.id === ssoUser.id);

    expect(local?.hasLocalPassword).toBe(true);
    expect(local?.isSsoUser).toBe(false);
    expect(local?.roleName).toBe(SYSTEM_ROLE_NAMES.REVIEWER);

    expect(sso?.hasLocalPassword).toBe(false);
    expect(sso?.isSsoUser).toBe(true);
  });
});
