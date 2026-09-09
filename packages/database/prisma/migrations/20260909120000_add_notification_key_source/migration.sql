-- CreateEnum
CREATE TYPE "public"."NotificationApiKeySource" AS ENUM ('ADMIN', 'PLATFORM');

-- AlterTable
ALTER TABLE "public"."NotificationApiKey" ADD COLUMN     "source" "public"."NotificationApiKeySource" NOT NULL DEFAULT 'ADMIN';

-- Backfill: until now, "provisioned by the platform" was read off the bound
-- app's source, so every existing key against a PLATFORM app is a provisioned
-- Builder key and must stay audience-scoped and metered. Everything else --
-- unbound legacy keys and keys bound to central-team apps -- is admin-issued,
-- which the column default already gives it.
--
-- Defaulting to ADMIN and narrowing here (rather than the reverse) is the safe
-- direction only because this statement runs in the same migration: a key that
-- kept the default would gain raw targeting, so the narrowing is not optional.
UPDATE "public"."NotificationApiKey" AS "key"
SET "source" = 'PLATFORM'
FROM "public"."MiniApp" AS "app"
WHERE "key"."miniAppId" = "app"."id"
  AND "app"."source" = 'PLATFORM';

-- DropIndex
DROP INDEX "public"."NotificationApiKey_miniAppId_idx";

-- CreateIndex
CREATE INDEX "NotificationApiKey_miniAppId_source_idx" ON "public"."NotificationApiKey"("miniAppId", "source");
