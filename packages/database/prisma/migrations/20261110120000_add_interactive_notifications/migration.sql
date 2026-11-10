
-- CreateEnum
CREATE TYPE "public"."NotificationCallbackStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."NotificationResponseChannel" AS ENUM ('APP', 'TRAY');

-- AlterTable
ALTER TABLE "public"."MiniApp" ADD COLUMN     "notificationCallbackSecret" TEXT,
ADD COLUMN     "notificationCallbackUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."UserNotificationToken" ADD COLUMN     "supportsTrayInteraction" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "interaction" JSONB,
ADD COLUMN     "interactionClosedAt" TIMESTAMP(3),
ADD COLUMN     "interactionExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."NotificationResponse" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "miniAppId" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "values" JSONB,
    "channel" "public"."NotificationResponseChannel" NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryStatus" "public"."NotificationCallbackStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "lastStatusCode" INTEGER,
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "valuesPurgedAt" TIMESTAMP(3),

    CONSTRAINT "NotificationResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationResponse_deliveryStatus_nextAttemptAt_idx" ON "public"."NotificationResponse"("deliveryStatus", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "NotificationResponse_miniAppId_deliveryStatus_idx" ON "public"."NotificationResponse"("miniAppId", "deliveryStatus");

-- CreateIndex
CREATE INDEX "NotificationResponse_valuesPurgedAt_deliveredAt_idx" ON "public"."NotificationResponse"("valuesPurgedAt", "deliveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationResponse_notificationId_userId_key" ON "public"."NotificationResponse"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "public"."NotificationResponse" ADD CONSTRAINT "NotificationResponse_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "public"."Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationResponse" ADD CONSTRAINT "NotificationResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationResponse" ADD CONSTRAINT "NotificationResponse_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
