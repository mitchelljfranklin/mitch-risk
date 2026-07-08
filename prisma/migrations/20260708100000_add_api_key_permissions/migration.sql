-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;

-- Existing keys keep full access
UPDATE "api_keys" SET "permissions" = ARRAY['vendors:view','vendors:create','vendors:edit','vendors:delete','assessments:view','assessments:create','assessments:edit','assessments:review','assessments:delete','templates:view','templates:create','templates:edit','templates:delete','frameworks:view','frameworks:edit','audit:view','users:manage','roles:manage','settings:manage','api:manage'];
