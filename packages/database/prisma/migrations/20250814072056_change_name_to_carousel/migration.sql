/*
  Warnings:

  - You are about to drop the `Carousel` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "BannerStatusType" AS ENUM ('PUBLISH', 'DRAFT');

-- CreateEnum
CREATE TYPE "BannerNavigationType" AS ENUM ('IN_APP_NAVIGATION', 'EXTERNAL_BROWSER', 'MINI_APP');

-- DropTable
DROP TABLE "Carousel";

-- DropEnum
DROP TYPE "CarouselNavigationType";

-- DropEnum
DROP TYPE "CarouselStatusType";

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "imageFilePath" TEXT NOT NULL,
    "status" "BannerStatusType" NOT NULL,
    "navigation" "BannerNavigationType" NOT NULL,
    "destination" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Banner_order_key" ON "Banner"("order");

-- CreateIndex
CREATE INDEX "Banner_order_idx" ON "Banner"("order");
