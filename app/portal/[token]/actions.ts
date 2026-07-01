"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { getAssessmentByToken } from "@/lib/db/assessments";
import { rateLimit } from "@/lib/rate-limit";

const MAX_ATTEMPTS_PER_TOKEN = 5;

export async function validatePortalPassword(
  token: string,
  password: string,
): Promise<{ ok: boolean; message?: string }> {
  const allowed = rateLimit("portal-password", token, MAX_ATTEMPTS_PER_TOKEN);
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
  cookieStore.set("portal-auth", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: `/portal/${token}`,
    expires: assessment.tokenExpiresAt ?? undefined,
    maxAge: 60 * 60 * 24, // 24 hours fallback
  });

  return { ok: true };
}
