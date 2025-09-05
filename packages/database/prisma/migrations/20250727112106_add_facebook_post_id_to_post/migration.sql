/*
  Warnings:

  - You are about to drop the column `title` on the `Post` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[facebookPostId]` on the table `Post` will be added. If there are existing duplicate values, this will fail.
  - Made the column `profilePictureUrl` on table `FacebookPage` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `facebookPostId` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FacebookPage" ALTER COLUMN "profilePictureUrl" SET NOT NULL;

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "title",
ADD COLUMN     "facebookPostId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Post_facebookPostId_key" ON "Post"("facebookPostId");
