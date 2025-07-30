/*
  Warnings:

  - A unique constraint covering the columns `[profilePictureCacheKey]` on the table `FacebookPage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cacheKey]` on the table `PostImage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `profilePictureCacheKey` to the `FacebookPage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cacheKey` to the `PostImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order` to the `PostImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FacebookPage" ADD COLUMN     "profilePictureCacheKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PostImage" ADD COLUMN     "cacheKey" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FacebookPage_profilePictureCacheKey_key" ON "FacebookPage"("profilePictureCacheKey");

-- CreateIndex
CREATE UNIQUE INDEX "PostImage_cacheKey_key" ON "PostImage"("cacheKey");
