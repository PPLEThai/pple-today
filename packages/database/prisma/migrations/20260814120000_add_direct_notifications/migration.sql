-- AlterTable
-- `units` defaults to 1, which is what a pre-existing row already meant back
-- when the quota counted calls, so the delivery-denominated SUM reads the
-- existing rows correctly with no backfill.
ALTER TABLE "public"."NotificationApiKeyUsageLog" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "units" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
-- NULLs are distinct in Postgres, so calls that supply no key are unconstrained.
CREATE UNIQUE INDEX "NotificationApiKeyUsageLog_notificationApiKeyId_idempotency_key" ON "public"."NotificationApiKeyUsageLog"("notificationApiKeyId", "idempotencyKey");
