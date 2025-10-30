-- CreateEnum
CREATE TYPE "public"."NotificationLinkType" AS ENUM ('MINI_APP', 'EXTERNAL_BROWSER', 'IN_APP_BROWSER');

-- CreateTable
CREATE TABLE "public"."UserNotificationToken" (
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationToken_pkey" PRIMARY KEY ("userId","token")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "image" TEXT,
    "linkType" "public"."NotificationLinkType",
    "linkValue" TEXT,
    "isBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumber" TEXT[],
    "roles" TEXT[],
    "provinces" TEXT[],
    "districts" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserNotification" (
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("userId","notificationId")
);

-- CreateIndex
CREATE INDEX "UserNotificationToken_userId_idx" ON "public"."UserNotificationToken"("userId");

-- CreateIndex
CREATE INDEX "UserNotification_notificationId_idx" ON "public"."UserNotification"("notificationId");

-- CreateIndex
CREATE INDEX "UserNotification_userId_idx" ON "public"."UserNotification"("userId");

-- AddForeignKey
ALTER TABLE "public"."UserNotificationToken" ADD CONSTRAINT "UserNotificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserNotification" ADD CONSTRAINT "UserNotification_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "public"."Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
