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
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("password reset tokens (integration)", () => {
  it("creates, validates, and consumes a reset token", async () => {
    const viewerRole = await getRoleByName(SYSTEM_ROLE_NAMES.VIEWER);
    if (!viewerRole) throw new Error("viewer role missing");

    const user = await createUser({
      name: "P55 Reset",
      email: TEST_EMAIL,
      password: "correct-horse-battery-staple",
      roleId: viewerRole.id,
    });

    const rawToken = await createPasswordResetToken(user.id);
    expect(rawToken.length).toBeGreaterThan(0);

    const validUser = await findValidResetToken(rawToken);
    expect(validUser).not.toBeNull();
    expect(validUser?.id).toBe(user.id);

    const userId = await consumeResetToken(rawToken);
    expect(userId).toBe(user.id);

    // Already-used token is rejected.
    expect(await consumeResetToken(rawToken)).toBeNull();
    expect(await findValidResetToken(rawToken)).toBeNull();
  });

  it("rejects an invalid token", async () => {
    expect(await findValidResetToken("not-a-real-token")).toBeNull();
    expect(await consumeResetToken("not-a-real-token")).toBeNull();
  });
});
