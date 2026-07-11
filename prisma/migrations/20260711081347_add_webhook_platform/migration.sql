-- CreateEnum
CREATE TYPE "WebhookPlatform" AS ENUM ('GENERIC', 'SLACK', 'MICROSOFT_TEAMS', 'DISCORD');

-- AlterTable
ALTER TABLE "webhook_endpoints" ADD COLUMN     "platform" "WebhookPlatform" NOT NULL DEFAULT 'GENERIC';
