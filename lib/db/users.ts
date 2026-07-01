import bcrypt from "bcryptjs";
import { type User, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const PASSWORD_SALT_ROUNDS = 12;

export function countUsers(): Promise<number> {
  return prisma.user.count();
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
      role: true,
      disabled: true,
      createdAt: true,
    },
  });
}

export function toggleUserDisabled(id: string, disabled: boolean) {
  return prisma.user.update({ where: { id }, data: { disabled } });
}

export function changeUserRole(id: string, role: UserRole) {
  return prisma.user.update({ where: { id }, data: { role } });
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
  role?: UserRole;
}): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role ?? UserRole.REVIEWER,
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
