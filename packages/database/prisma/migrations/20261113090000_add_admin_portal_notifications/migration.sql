-- CreateEnum
CREATE TYPE "public"."NotificationOrigin" AS ENUM ('API', 'ADMIN_PORTAL');

-- AlterEnum
ALTER TYPE "public"."NotificationCallbackStatus" ADD VALUE 'NONE';

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "origin" "public"."NotificationOrigin" NOT NULL DEFAULT 'API',
ADD COLUMN     "sentByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_origin_createdAt_idx" ON "public"."Notification"("origin", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
