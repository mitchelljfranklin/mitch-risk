-- Add an indexed lookup prefix so API-key authentication resolves a single
-- candidate by prefix and runs exactly one bcrypt compare, instead of hashing
-- every stored key on every request (a DoS-amplification and timing-oracle risk).
--
-- Pre-existing keys have no lookup prefix and cannot be migrated because the
-- plaintext key is unrecoverable. They are disabled here and must be regenerated
-- by an administrator from Settings -> API.

-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN "keyPrefix" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "api_keys_keyPrefix_idx" ON "api_keys"("keyPrefix");

-- Invalidate legacy keys that predate the lookup-prefix scheme.
UPDATE "api_keys" SET "disabled" = true WHERE "keyPrefix" = '';
