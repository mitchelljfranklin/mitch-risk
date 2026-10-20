"use server";

import { AuthError } from "next-auth";
import { getTranslations } from "next-intl/server";

import { signIn } from "@/lib/auth";
import { countUsers, createUser } from "@/lib/db/users";
import { ensureSystemRoles, getRoleByName } from "@/lib/db/roles";
import { SYSTEM_ROLE_NAMES } from "@/lib/permissions";
import { setupAdminSchema } from "@/lib/schemas/auth";
import { Prisma } from "../../../prisma/generated/prisma/client";

export type SetupState = { error: string } | undefined;

export async function createInitialAdmin(
  previousState: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const translations = await getTranslations("Auth.setup");
  if ((await countUsers()) > 0) {
    return { error: translations("alreadyDone") };
  }

  const parsed = setupAdminSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: translations("invalid") };
  }

  await ensureSystemRoles();
  const adminRole = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
  if (!adminRole) {
    return { error: translations("roleError") };
  }

  try {
    await createUser({ ...parsed.data, roleId: adminRole.id });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: translations("alreadyDone") };
    }
    throw error;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: translations("createdSignIn") };
    }
    throw error;
  }
}
