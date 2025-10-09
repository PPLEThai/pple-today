/*
Warnings:

- The primary key for the `UserFollowsUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
- You are about to drop the column `followedId` on the `UserFollowsUser` table. All the data in the column will be lost.
- Added the required column `followingId` to the `UserFollowsUser` table without a default value. This is not possible if the table is not empty.

*/

-- Drop foreign key constraint for followedId
ALTER TABLE "public"."UserFollowsUser" DROP CONSTRAINT "UserFollowsUser_followedId_fkey";

-- Drop index for followedId
DROP INDEX "public"."UserFollowsUser_followedId_idx";

-- Rename column followedId to followingId
ALTER TABLE "public"."UserFollowsUser" RENAME COLUMN "followedId" TO "followingId";

-- Add index for followingId
CREATE INDEX "UserFollowsUser_followingId_idx" ON "public"."UserFollowsUser"("followingId");

-- Add primary key constraint for (followingId, followerId)
ALTER TABLE "public"."UserFollowsUser" ADD CONSTRAINT "UserFollowsUser_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;