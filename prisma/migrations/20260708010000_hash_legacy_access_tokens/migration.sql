-- One-off data migration: hash any remaining plaintext accessToken values.
-- After this migration the application OR fallback clause ({ accessToken: token }) is removed.
UPDATE "assessments" SET "tokenHash" = encode(sha256(CAST("accessToken" AS bytea)), 'hex') WHERE "accessToken" IS NOT NULL AND ("tokenHash" IS NULL OR "tokenHash" = '');
