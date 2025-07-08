/*
  Warnings:

  - A unique constraint covering the columns `[postId,authorId]` on the table `PostReaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PostReaction_authorId_idx";

-- DropIndex
DROP INDEX "PostReaction_postId_idx";

-- AlterTable
ALTER TABLE "PostComment" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "PostReaction_postId_authorId_key" ON "PostReaction"("postId", "authorId");
