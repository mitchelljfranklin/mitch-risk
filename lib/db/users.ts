import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { type User } from "../../prisma/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { generateAccessToken } from "@/lib/tokens";

const PASSWORD_SALT_ROUNDS = 12;
const RESET_TOKEN_HOURS = 1;
const RESET_TOKEN_SEPARATOR = ".";

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

export type StaffAccount = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  disabled: boolean;
  createdAt: Date;
  isSsoUser: boolean;
  hasLocalPassword: boolean;
};

export async function listStaffAccounts(): Promise<StaffAccount[]> {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      roleId: true,
      role: { select: { name: true } },
      disabled: true,
      createdAt: true,
      passwordHash: true,
      _count: { select: { ssoIdentities: true } },
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    roleName: user.role.name,
    disabled: user.disabled,
    createdAt: user.createdAt,
    isSsoUser: user._count.ssoIdentities > 0,
    hasLocalPassword: hasLocalPassword(user.passwordHash),
  }));
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

export type DeletionImpact = {
  ownedVendors: number;
  reviewingAssessments: number;
  resolvedFindings: number;
  answerReviews: number;
  createdApiKeys: number;
};

export async function getUserDeletionImpact(
  userId: string,
): Promise<DeletionImpact> {
  const [
    ownedVendors,
    reviewingAssessments,
    resolvedFindings,
    answerReviews,
    createdApiKeys,
  ] = await Promise.all([
    prisma.vendor.count({ where: { ownerId: userId } }),
    prisma.assessment.count({ where: { reviewerId: userId } }),
    prisma.finding.count({ where: { resolvedById: userId } }),
    prisma.answerReview.count({ where: { reviewerId: userId } }),
    prisma.apiKey.count({ where: { createdBy: userId } }),
  ]);

  return {
    ownedVendors,
    reviewingAssessments,
    resolvedFindings,
    answerReviews,
    createdApiKeys,
  };
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

export function hasLocalPassword(passwordHash: string): boolean {
  return (passwordHash ?? "").trim().length > 0;
}

export async function getUserAuthInfo(
  userId: string,
): Promise<{ hasLocalPassword: boolean; isSsoUser: boolean } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordHash: true,
      _count: { select: { ssoIdentities: true } },
    },
  });
  if (!user) {
    return null;
  }
  return {
    hasLocalPassword: hasLocalPassword(user.passwordHash),
    isSsoUser: user._count.ssoIdentities > 0,
  };
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

function parseResetToken(
  rawToken: string,
): { id: string; secret: string } | null {
  const separatorIndex = rawToken.indexOf(RESET_TOKEN_SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex === rawToken.length - 1) {
    return null;
  }
  return {
    id: rawToken.slice(0, separatorIndex),
    secret: rawToken.slice(separatorIndex + 1),
  };
}

export async function createPasswordResetToken(
  userId: string,
): Promise<string> {
  const id = randomBytes(16).toString("base64url");
  const secret = generateAccessToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: {
      id,
      userId,
      tokenHash: await bcrypt.hash(secret, PASSWORD_SALT_ROUNDS),
      expiresAt,
    },
  });
  return `${id}${RESET_TOKEN_SEPARATOR}${secret}`;
}

export async function consumeResetToken(
  rawToken: string,
): Promise<string | null> {
  const parsedToken = parseResetToken(rawToken);
  if (!parsedToken) return null;

  const record = await prisma.passwordResetToken.findUnique({
    where: { id: parsedToken.id },
  });
  if (!record) return null;
  if (record.used) return null;
  if (record.expiresAt < new Date()) return null;

  const secretMatches = await bcrypt.compare(
    parsedToken.secret,
    record.tokenHash,
  );
  if (!secretMatches) return null;

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, used: false },
      data: { used: true },
    });
    if (claimed.count === 0) return null;
    return record.userId;
  });
}

export async function findValidResetToken(
  rawToken: string,
): Promise<User | null> {
  const parsedToken = parseResetToken(rawToken);
  if (!parsedToken) return null;

  const record = await prisma.passwordResetToken.findUnique({
    where: { id: parsedToken.id },
    include: { user: true },
  });
  if (!record || record.used || record.expiresAt < new Date()) {
    return null;
  }

  const secretMatches = await bcrypt.compare(
    parsedToken.secret,
    record.tokenHash,
  );
  if (!secretMatches) return null;

  return record.user;
}
