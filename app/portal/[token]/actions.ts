"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { getAssessmentByToken } from "@/lib/db/assessments";
import { rateLimit } from "@/lib/rate-limit";
import { getAssessmentSettings } from "@/lib/settings";

export async function validatePortalPassword(
  token: string,
  password: string,
): Promise<{ ok: boolean; message?: string }> {
  const { portalPasswordAttemptsPerMin } = await getAssessmentSettings();
  const allowed = rateLimit(
    "portal-password",
    token,
    portalPasswordAttemptsPerMin,
  );
  if (!allowed) {
    return { ok: false, message: "Too many attempts. Please wait a minute." };
  }

  const assessment = await getAssessmentByToken(token);
  if (!assessment || !assessment.portalPasswordHash) {
    return { ok: false, message: "No password is set for this link." };
  }

  const valid = bcrypt.compareSync(password, assessment.portalPasswordHash);
  if (!valid) {
    return { ok: false, message: "Incorrect password." };
  }

  const cookieStore = await cookies();
  const FALLBACK_MAX_AGE = 60 * 60 * 24; // 24 hours
  const remainingSeconds = assessment.tokenExpiresAt
    ? Math.floor((assessment.tokenExpiresAt.getTime() - Date.now()) / 1000)
    : FALLBACK_MAX_AGE;
  // Never let the auth cookie outlive the token; cap at the 24h fallback.
  const maxAge = Math.max(0, Math.min(remainingSeconds, FALLBACK_MAX_AGE));
  cookieStore.set("portal-auth", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: `/portal/${token}`,
    expires: assessment.tokenExpiresAt ?? undefined,
    maxAge,
  });

  return { ok: true };
}
