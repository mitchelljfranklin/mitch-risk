import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

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
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        name: "SSO User",
        passwordHash: "",
        role: "REVIEWER",
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
      include: { user: true },
    });

    expect(identity).not.toBeNull();
    if (!identity) throw new Error("identity not found");
    expect(identity.user.email).toBe(TEST_EMAIL);
    expect(identity.user.role).toBe("REVIEWER");
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
