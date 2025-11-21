-- CreateEnum
CREATE TYPE "public"."FeedItemReactionLogType" AS ENUM ('UP_VOTE', 'DOWN_VOTE', 'REMOVE_VOTE');

-- CreateEnum
CREATE TYPE "public"."FeedItemCommentAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "public"."FollowActionType" AS ENUM ('FOLLOW', 'UNFOLLOW');

-- CreateTable
CREATE TABLE "public"."FeedItemReactionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "type" "public"."FeedItemReactionLogType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedItemReactionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeedItemCommentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "content" TEXT,
    "commentId" TEXT,
    "isPrivate" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedItemCommentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserFollowsUserLog" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "action" "public"."FollowActionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollowsUserLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedItemReactionLog_feedItemId_idx" ON "public"."FeedItemReactionLog"("feedItemId");

-- CreateIndex
CREATE INDEX "FeedItemReactionLog_userId_idx" ON "public"."FeedItemReactionLog"("userId");

-- CreateIndex
CREATE INDEX "FeedItemReactionLog_createdAt_idx" ON "public"."FeedItemReactionLog"("createdAt");

-- CreateIndex
CREATE INDEX "UserFollowsUserLog_followerId_idx" ON "public"."UserFollowsUserLog"("followerId");

-- CreateIndex
CREATE INDEX "UserFollowsUserLog_followingId_idx" ON "public"."UserFollowsUserLog"("followingId");

-- AddForeignKey
ALTER TABLE "public"."FeedItemReactionLog" ADD CONSTRAINT "FeedItemReactionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedItemReactionLog" ADD CONSTRAINT "FeedItemReactionLog_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "public"."FeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedItemCommentLog" ADD CONSTRAINT "FeedItemCommentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedItemCommentLog" ADD CONSTRAINT "FeedItemCommentLog_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "public"."FeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedItemCommentLog" ADD CONSTRAINT "FeedItemCommentLog_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."FeedItemComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserFollowsUserLog" ADD CONSTRAINT "UserFollowsUserLog_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserFollowsUserLog" ADD CONSTRAINT "UserFollowsUserLog_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
