import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  APP_ENCRYPTION_KEY: z
    .string()
    .min(32, "APP_ENCRYPTION_KEY must be at least 32 characters"),
  APP_URL: z.string().min(1).default("http://localhost:3000"),
  CRON_SECRET: z.string().min(1).optional(),
  EVIDENCE_STORAGE_PATH: z.string().min(1).default("./.storage/evidence"),
});

export type Environment = z.infer<typeof environmentSchema>;

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

  return parsed.data;
}

export const env = loadEnvironment();
