import bcrypt from "bcryptjs";
import { type User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateAccessToken, hashToken } from "@/lib/tokens";

const PASSWORD_SALT_ROUNDS = 12;
const RESET_TOKEN_HOURS = 1;

export function countUsers(): Promise<number> {
  return prisma.user.count();
}

export function countUsersWithPermission(permission: string): Promise<number> {
  return prisma.user.count({
    where: { disabled: false, role: { permissions: { has: permission } } },
  });
}

export function listUsers() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

export function listUsersFull() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      roleId: true,
      role: { select: { id: true, name: true } },
      disabled: true,
      createdAt: true,
    },
  });
}

export function toggleUserDisabled(id: string, disabled: boolean) {
  return prisma.user.update({ where: { id }, data: { disabled } });
}

export function changeUserRole(id: string, roleId: string) {
  return prisma.user.update({ where: { id }, data: { roleId } });
}

export function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}

export function countAdminsExcluding(
  userId: string,
  permission: string,
): Promise<number> {
  return prisma.user.count({
    where: {
      id: { not: userId },
      role: { permissions: { has: permission } },
    },
  });
}

export async function resetUserPassword(
  id: string,
  password: string,
): Promise<void> {
  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
}

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  roleId: string;
}): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      roleId: input.roleId,
    },
  });
}

export async function verifyUserCredentials(
  email: string,
  password: string,
): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return null;
  }

  return user;
}

export async function createPasswordResetToken(
  userId: string,
): Promise<string> {
  const rawToken = generateAccessToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });
  return rawToken;
}

export async function consumeResetToken(
  rawToken: string,
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  return prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record) return null;
    if (record.used) return null;
    if (record.expiresAt < new Date()) return null;

    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    });

    return record.userId;
  });
}

export async function findValidResetToken(
  rawToken: string,
): Promise<User | null> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!record || record.used || record.expiresAt < new Date()) {
    return null;
  }
  return record.user;
}
