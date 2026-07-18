-- CreateEnum
CREATE TYPE "public"."MiniAppTier" AS ENUM ('DRAFT', 'BETA', 'LIVE');

-- CreateEnum
CREATE TYPE "public"."MiniAppSource" AS ENUM ('ADMIN', 'PLATFORM');

-- AlterTable
ALTER TABLE "public"."MiniApp" ADD COLUMN     "ownerSub" TEXT,
ADD COLUMN     "source" "public"."MiniAppSource" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "tier" "public"."MiniAppTier" NOT NULL DEFAULT 'LIVE';
