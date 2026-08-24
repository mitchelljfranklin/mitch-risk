import { z } from "zod";

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must be at least 32 characters"),
    APP_ENCRYPTION_KEY: z
      .string()
      .min(32, "APP_ENCRYPTION_KEY must be at least 32 characters"),
    APP_URL: z.string().min(1).default("http://localhost:3000"),
    CRON_SECRET: z.string().min(1).optional(),
    EVIDENCE_STORAGE_PATH: z.string().min(1).default("./.storage/evidence"),
    TRUSTED_PROXY_COUNT: z.coerce.number().int().min(0).default(0),
    CLIENT_IP_HEADER: z.string().min(1).optional(),
  })
  .superRefine((values, context) => {
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
    const isProduction = values.NODE_ENV === "production" && !isBuildPhase;
    if (isProduction && !values.CRON_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CRON_SECRET"],
        message: "CRON_SECRET is required in production",
      });
    }
    // A short cron secret is brute-forceable online despite timing-safe
    // comparison, so enforce real entropy where the endpoint is exposed.
    if (
      isProduction &&
      values.CRON_SECRET !== undefined &&
      values.CRON_SECRET.length < 32
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CRON_SECRET"],
        message: "CRON_SECRET must be at least 32 characters in production",
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function deriveAuthUrl(
  existingAuthUrl: string | undefined,
  appUrl: string,
): string {
  const trimmed = existingAuthUrl?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : appUrl;
}

function loadEnvironment(): Environment {
  const parsed = environmentSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(
        (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      )
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  // Auth.js (NextAuth) builds OAuth callback URLs from AUTH_URL, not APP_URL.
  // Default it to APP_URL so a single public-URL setting drives both app links
  // and SSO redirect URIs; an explicit AUTH_URL still takes precedence.
  process.env.AUTH_URL = deriveAuthUrl(
    process.env.AUTH_URL,
    parsed.data.APP_URL,
  );

  return parsed.data;
}

export const env = loadEnvironment();
