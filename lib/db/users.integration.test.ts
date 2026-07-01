import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createUser, verifyUserCredentials } from "@/lib/db/users";
import { prisma } from "@/lib/prisma";

const testEmail = "phase0-integration@example.test";

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: testEmail } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe("user credentials (integration)", () => {
  it("creates a user and verifies correct and incorrect passwords", async () => {
    const created = await createUser({
      name: "Phase 0 Tester",
      email: testEmail,
      password: "correct-horse-battery",
      role: "ADMIN",
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
