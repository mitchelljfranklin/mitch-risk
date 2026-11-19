import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  consumeResetToken,
  createPasswordResetToken,
  createUser,
  deleteUser,
  findUserByEmail,
  findValidResetToken,
} from "@/lib/db/users";
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const TEST_EMAIL = "p55-reset@example.test";

let testUserId = "";

async function cleanup() {
  const user = await findUserByEmail(TEST_EMAIL);
  if (user) {
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });
    await deleteUser(user.id);
  }
}

beforeAll(async () => {
  await cleanup();
  await ensureSystemRoles();
  const viewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.VIEWER);
  if (!viewerRole) throw new Error("viewer role missing");

  const user = await createUser({
    name: "P55 Reset",
    email: TEST_EMAIL,
    password: "correct-horse-battery-staple",
    roleId: viewerRole.id,
  });
  testUserId = user.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("password reset tokens (integration)", () => {
  it("creates, validates, and consumes a reset token", async () => {
    const rawToken = await createPasswordResetToken(testUserId);
    expect(rawToken.length).toBeGreaterThan(0);

    const validUser = await findValidResetToken(rawToken);
    expect(validUser).not.toBeNull();
    expect(validUser?.id).toBe(testUserId);

    const userId = await consumeResetToken(rawToken);
    expect(userId).toBe(testUserId);

    // Already-used token is rejected.
    expect(await consumeResetToken(rawToken)).toBeNull();
    expect(await findValidResetToken(rawToken)).toBeNull();
  });

  it("stores only a bcrypt hash of the reset secret", async () => {
    const rawToken = await createPasswordResetToken(testUserId);
    const [recordId, secret] = rawToken.split(".");
    const record = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { id: recordId },
    });

    expect(record.tokenHash).toMatch(/^\$2[aby]\$/);
    expect(record.tokenHash).not.toBe(secret);
    expect(record.tokenHash).not.toContain(secret);
  });

  it("rejects a valid id paired with the wrong secret", async () => {
    const rawToken = await createPasswordResetToken(testUserId);
    const [recordId] = rawToken.split(".");

    expect(await findValidResetToken(`${recordId}.wrong-secret`)).toBeNull();
    expect(await consumeResetToken(`${recordId}.wrong-secret`)).toBeNull();
  });

  it("rejects an invalid token", async () => {
    expect(await findValidResetToken("not-a-real-token")).toBeNull();
    expect(await consumeResetToken("not-a-real-token")).toBeNull();
  });
});
