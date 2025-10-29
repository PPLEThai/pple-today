/*
  Warnings:

  - A unique constraint covering the columns `[miniAppId]` on the table `Banner` will be added. If there are existing duplicate values, this will fail.
  - Made the column `bannerImagePath` on table `Topic` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Banner" ADD COLUMN     "miniAppId" TEXT,
ALTER COLUMN "destination" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."MiniApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "clientId" TEXT NOT NULL,
    "clientUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bannerId" TEXT,

    CONSTRAINT "MiniApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MiniApp_bannerId_key" ON "public"."MiniApp"("bannerId");

-- CreateIndex
CREATE INDEX "MiniApp_order_idx" ON "public"."MiniApp"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Banner_miniAppId_key" ON "public"."Banner"("miniAppId");

-- AddForeignKey
ALTER TABLE "public"."Banner" ADD CONSTRAINT "Banner_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE SET NULL ON UPDATE CASCADE;
