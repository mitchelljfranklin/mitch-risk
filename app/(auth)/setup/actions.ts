"use server";

import { UserRole } from "@prisma/client";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { countUsers, createUser } from "@/lib/db/users";
import { setupAdminSchema } from "@/lib/schemas/auth";

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

  await createUser({ ...parsed.data, role: UserRole.ADMIN });

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
