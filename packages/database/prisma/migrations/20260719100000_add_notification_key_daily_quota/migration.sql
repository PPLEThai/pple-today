-- AlterTable
ALTER TABLE "public"."NotificationApiKey" ADD COLUMN     "dailyQuota" INTEGER NOT NULL DEFAULT 1000;

-- CreateIndex
CREATE INDEX "NotificationApiKeyUsageLog_notificationApiKeyId_usedAt_idx" ON "public"."NotificationApiKeyUsageLog"("notificationApiKeyId", "usedAt");
