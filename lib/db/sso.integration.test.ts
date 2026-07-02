import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";

const TEST_EMAIL = "sso-test@example.test";
const TEST_PROVIDER = "test-provider";
const TEST_PROVIDER_ID = "test-provider-id-123";

async function cleanup() {
  await prisma.ssoIdentity.deleteMany({
    where: { user: { email: TEST_EMAIL } },
  });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
}

beforeAll(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("SSO identity model (integration)", () => {
  it("creates user and links SsoIdentity on first sign-in", async () => {
    await ensureSystemRoles();
    const reviewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.REVIEWER);
    if (!reviewerRole) throw new Error("reviewer role not found");

    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        name: "SSO User",
        passwordHash: "",
        roleId: reviewerRole.id,
      },
    });

    await prisma.ssoIdentity.create({
      data: {
        userId: user.id,
        provider: TEST_PROVIDER,
        providerId: TEST_PROVIDER_ID,
      },
    });

    const identity = await prisma.ssoIdentity.findUnique({
      where: {
        provider_providerId: {
          provider: TEST_PROVIDER,
          providerId: TEST_PROVIDER_ID,
        },
      },
      include: { user: { include: { role: true } } },
    });

    expect(identity).not.toBeNull();
    if (!identity) throw new Error("identity not found");
    expect(identity.user.email).toBe(TEST_EMAIL);
    expect(identity.user.role.name).toBe(SYSTEM_ROLE_NAMES.REVIEWER);
    expect(identity.provider).toBe(TEST_PROVIDER);
  });

  it("second sign-in maps to existing user without creating duplicate", async () => {
    const existing = await prisma.user.findUnique({
      where: { email: TEST_EMAIL },
    });
    if (!existing) throw new Error("user not found from previous test");

    const identity = await prisma.ssoIdentity.findUnique({
      where: {
        provider_providerId: {
          provider: TEST_PROVIDER,
          providerId: TEST_PROVIDER_ID,
        },
      },
    });

    expect(identity).not.toBeNull();
    expect(identity?.userId).toBe(existing.id);
  });

  it("disabled user returns no identity", async () => {
    await prisma.user.update({
      where: { email: TEST_EMAIL },
      data: { disabled: true },
    });

    const identity = await prisma.ssoIdentity.findUnique({
      where: {
        provider_providerId: {
          provider: TEST_PROVIDER,
          providerId: TEST_PROVIDER_ID,
        },
      },
      include: { user: true },
    });

    expect(identity?.user.disabled).toBe(true);
  });
});
