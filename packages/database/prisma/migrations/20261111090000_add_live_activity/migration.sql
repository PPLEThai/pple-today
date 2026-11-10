-- AlterTable
ALTER TABLE "public"."UserNotificationToken" ADD COLUMN     "liveActivitiesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liveActivityStartToken" TEXT;

-- CreateTable
CREATE TABLE "public"."NotificationLiveActivity" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLiveActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationLiveActivity_notificationId_endedAt_idx" ON "public"."NotificationLiveActivity"("notificationId", "endedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLiveActivity_notificationId_deviceToken_key" ON "public"."NotificationLiveActivity"("notificationId", "deviceToken");

-- AddForeignKey
ALTER TABLE "public"."NotificationLiveActivity" ADD CONSTRAINT "NotificationLiveActivity_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "public"."Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationLiveActivity" ADD CONSTRAINT "NotificationLiveActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationLiveActivity" ADD CONSTRAINT "NotificationLiveActivity_deviceToken_fkey" FOREIGN KEY ("deviceToken") REFERENCES "public"."UserNotificationToken"("token") ON DELETE CASCADE ON UPDATE CASCADE;
