/*
  Warnings:

  - The primary key for the `FeedItemReaction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `FeedItemReaction` table. All the data in the column will be lost.
  - Added the required column `content` to the `FeedItemComment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `FeedItemReaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FeedItemReactionType" AS ENUM ('UP_VOTE', 'DOWN_VOTE');

-- AlterTable
ALTER TABLE "FeedItem" ADD COLUMN     "numberOfComments" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FeedItemComment" ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FeedItemReaction" DROP CONSTRAINT "FeedItemReaction_pkey",
DROP COLUMN "id",
ADD COLUMN     "type" "FeedItemReactionType" NOT NULL,
ADD CONSTRAINT "FeedItemReaction_pkey" PRIMARY KEY ("userId", "feedItemId");

-- DropEnum
DROP TYPE "PostReactionType";

-- CreateTable
CREATE TABLE "FeedItemReactionCount" (
    "feedItemId" TEXT NOT NULL,
    "type" "FeedItemReactionType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedItemReactionCount_pkey" PRIMARY KEY ("feedItemId","type")
);

-- AddForeignKey
ALTER TABLE "FeedItemReactionCount" ADD CONSTRAINT "FeedItemReactionCount_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "FeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
