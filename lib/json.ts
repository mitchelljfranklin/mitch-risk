import { Prisma } from "@prisma/client";

export function copyJson(
  value: Prisma.JsonValue | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null ? Prisma.DbNull : structuredClone(value);
}
