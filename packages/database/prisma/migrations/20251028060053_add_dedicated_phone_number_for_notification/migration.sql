/*
  Warnings:

  - You are about to drop the column `phoneNumber` on the `Notification` table. All the data in the column will be lost.
  - Made the column `bannerImagePath` on table `Topic` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Notification" DROP COLUMN "phoneNumber";

-- AlterTable
ALTER TABLE "public"."Topic" ALTER COLUMN "bannerImagePath" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."NotificationPhoneNumber" (
    "notificationId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,

    CONSTRAINT "NotificationPhoneNumber_pkey" PRIMARY KEY ("notificationId","phoneNumber")
);

-- CreateTable
CREATE TABLE "public"."NotificationApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationApiKeyUsageLog" (
    "id" TEXT NOT NULL,
    "notificationApiKeyId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "body" JSONB NOT NULL,

    CONSTRAINT "NotificationApiKeyUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationPhoneNumber_phoneNumber_idx" ON "public"."NotificationPhoneNumber"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationApiKey_apiKey_key" ON "public"."NotificationApiKey"("apiKey");

-- CreateIndex
CREATE INDEX "NotificationApiKey_active_apiKey_idx" ON "public"."NotificationApiKey"("active", "apiKey");

-- CreateIndex
CREATE INDEX "NotificationApiKeyUsageLog_notificationApiKeyId_idx" ON "public"."NotificationApiKeyUsageLog"("notificationApiKeyId");

-- CreateIndex
CREATE INDEX "NotificationApiKeyUsageLog_usedAt_idx" ON "public"."NotificationApiKeyUsageLog"("usedAt");

-- AddForeignKey
ALTER TABLE "public"."NotificationPhoneNumber" ADD CONSTRAINT "NotificationPhoneNumber_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "public"."Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationApiKeyUsageLog" ADD CONSTRAINT "NotificationApiKeyUsageLog_notificationApiKeyId_fkey" FOREIGN KEY ("notificationApiKeyId") REFERENCES "public"."NotificationApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
