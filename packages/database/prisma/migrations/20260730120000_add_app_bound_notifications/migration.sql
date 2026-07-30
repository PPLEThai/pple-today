-- CreateEnum
CREATE TYPE "public"."NotificationTokenPlatform" AS ENUM ('IOS', 'ANDROID');

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "miniAppId" TEXT;

-- AlterTable
ALTER TABLE "public"."UserNotificationToken" ADD COLUMN     "platform" "public"."NotificationTokenPlatform",
ADD COLUMN     "supportsAppBranding" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Notification_miniAppId_idx" ON "public"."Notification"("miniAppId");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
