-- AlterTable
ALTER TABLE "public"."MiniApp" ADD COLUMN     "platformBridgeSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MiniApp_platformBridgeSlug_key" ON "public"."MiniApp"("platformBridgeSlug");
