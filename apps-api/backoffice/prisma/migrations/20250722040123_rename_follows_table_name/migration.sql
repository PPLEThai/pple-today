/*
  Warnings:

  - You are about to drop the `FollowedTopic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FollowedUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FollowedTopic" DROP CONSTRAINT "FollowedTopic_topicId_fkey";

-- DropForeignKey
ALTER TABLE "FollowedTopic" DROP CONSTRAINT "FollowedTopic_userId_fkey";

-- DropForeignKey
ALTER TABLE "FollowedUser" DROP CONSTRAINT "FollowedUser_authorId_fkey";

-- DropForeignKey
ALTER TABLE "FollowedUser" DROP CONSTRAINT "FollowedUser_followedUserId_fkey";

-- DropTable
DROP TABLE "FollowedTopic";

-- DropTable
DROP TABLE "FollowedUser";

-- CreateTable
CREATE TABLE "UserFollowsUser" (
    "followedId" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFollowsUser_pkey" PRIMARY KEY ("followedId","followerId")
);

-- CreateTable
CREATE TABLE "UserFollowsTopic" (
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFollowsTopic_pkey" PRIMARY KEY ("userId","topicId")
);

-- AddForeignKey
ALTER TABLE "UserFollowsUser" ADD CONSTRAINT "UserFollowsUser_followedId_fkey" FOREIGN KEY ("followedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollowsUser" ADD CONSTRAINT "UserFollowsUser_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollowsTopic" ADD CONSTRAINT "UserFollowsTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFollowsTopic" ADD CONSTRAINT "UserFollowsTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
