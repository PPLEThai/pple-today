-- CreateEnum
CREATE TYPE "CarouselStatusType" AS ENUM ('PUBLISH', 'DRAFT');

-- CreateEnum
CREATE TYPE "CarouselNavigationType" AS ENUM ('IN_APP_NAVIGATION', 'EXTERNAL_BROWSER', 'MINI_APP');

-- CreateTable
CREATE TABLE "Carousel" (
    "id" TEXT NOT NULL,
    "imageFilePath" TEXT NOT NULL,
    "status" "CarouselStatusType" NOT NULL,
    "navigation" "CarouselNavigationType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carousel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Carousel_order_key" ON "Carousel"("order");

-- CreateIndex
CREATE INDEX "Carousel_order_idx" ON "Carousel"("order");
