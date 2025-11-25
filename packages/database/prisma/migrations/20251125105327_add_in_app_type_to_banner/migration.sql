-- CreateEnum
CREATE TYPE "public"."BannerInAppType" AS ENUM ('POST', 'POLL', 'TOPIC', 'USER', 'ANNOUNCEMENT', 'ELECTION', 'HASHTAG');

-- AlterTable
ALTER TABLE "public"."Banner" ADD COLUMN     "inAppId" TEXT,
ADD COLUMN     "inAppType" "public"."BannerInAppType";
