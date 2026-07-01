-- Add tokenHash to assessments (Phase 33 - portal token hashing via db push, not previously captured in migrations)
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "tokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "assessments_tokenHash_key" ON "assessments"("tokenHash");

-- Add rateLimitPerMin to api_keys (Phase 33 - API key auth via db push, not previously captured in migrations)
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "rateLimitPerMin" INT;
