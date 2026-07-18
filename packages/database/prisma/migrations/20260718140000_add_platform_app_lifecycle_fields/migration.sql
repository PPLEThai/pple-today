-- AlterTable
ALTER TABLE "public"."MiniApp" ADD COLUMN     "retiredAt" TIMESTAMP(3),
ADD COLUMN     "zitadelAppId" TEXT;

-- AlterTable
ALTER TABLE "public"."NotificationApiKey" ADD COLUMN     "miniAppId" TEXT;

-- CreateIndex
CREATE INDEX "NotificationApiKey_miniAppId_idx" ON "public"."NotificationApiKey"("miniAppId");

-- AddForeignKey
ALTER TABLE "public"."NotificationApiKey" ADD CONSTRAINT "NotificationApiKey_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
