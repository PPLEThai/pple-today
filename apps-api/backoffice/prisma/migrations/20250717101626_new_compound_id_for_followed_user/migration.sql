/*
  Warnings:

  - The primary key for the `FollowedUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `FollowedUser` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FollowedUser" DROP CONSTRAINT "FollowedUser_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "FollowedUser_pkey" PRIMARY KEY ("authorId", "followedUserId");
