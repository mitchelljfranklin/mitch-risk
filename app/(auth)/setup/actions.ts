"use server";

import { AuthError } from "next-auth";

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
  if ((await countUsers()) > 0) {
    return { error: "Setup has already been completed." };
  }

  const parsed = setupAdminSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  await ensureSystemRoles();
  const adminRole = await getRoleByName(SYSTEM_ROLE_NAMES.ADMIN);
  if (!adminRole) {
    return { error: "Could not initialize the Admin role. Please try again." };
  }

  try {
    await createUser({ ...parsed.data, roleId: adminRole.id });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Setup has already been completed." };
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
      return { error: "Account created. Please sign in." };
    }
    throw error;
  }
}
