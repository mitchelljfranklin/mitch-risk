"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getAssessmentSettings } from "@/lib/settings";

export type LoginState = { error: string } | undefined;

export async function authenticate(
  previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const settings = await getAssessmentSettings();
  const rateLimitPerMin = settings.loginRateLimitPerMin ?? 10;

  if (!rateLimit("login", ip, rateLimitPerMin)) {
    return { error: "Too many attempts. Please wait a moment and try again." };
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}
