"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { getTranslations } from "next-intl/server";

import { signIn } from "@/lib/auth";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { getAssessmentSettings } from "@/lib/settings";

export type LoginState = { error: string } | undefined;

export async function authenticate(
  previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const translations = await getTranslations("Auth.login");
  const headersList = await headers();
  const clientIp = getClientIp(headersList);

  const settings = await getAssessmentSettings();
  const rateLimitPerMin = settings.loginRateLimitPerMin ?? 10;

  if (!rateLimit("login", clientIp, rateLimitPerMin)) {
    return { error: translations("tooMany") };
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
      return { error: translations("invalid") };
    }
    throw error;
  }
}
