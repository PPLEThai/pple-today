-- DropIndex
DROP INDEX "public"."Banner_order_idx";

-- DropIndex
DROP INDEX "public"."HashTag_name_idx";

-- DropIndex
DROP INDEX "public"."Topic_name_idx";

-- AlterTable
ALTER TABLE "public"."Banner" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "Announcement_status_idx" ON "public"."Announcement"("status");

-- CreateIndex
CREATE INDEX "Announcement_type_idx" ON "public"."Announcement"("type");

-- CreateIndex
CREATE INDEX "Banner_status_idx" ON "public"."Banner"("status");

-- CreateIndex
CREATE INDEX "Banner_navigation_idx" ON "public"."Banner"("navigation");

-- CreateIndex
CREATE INDEX "HashTag_status_idx" ON "public"."HashTag"("status");

-- CreateIndex
CREATE INDEX "Poll_status_idx" ON "public"."Poll"("status");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "public"."Post"("status");

-- CreateIndex
CREATE INDEX "Topic_status_idx" ON "public"."Topic"("status");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status");
