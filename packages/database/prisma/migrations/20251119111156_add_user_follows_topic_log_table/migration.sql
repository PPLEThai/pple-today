-- CreateTable
CREATE TABLE "public"."UserFollowsTopicLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "action" "public"."FollowActionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollowsTopicLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFollowsTopicLog_userId_idx" ON "public"."UserFollowsTopicLog"("userId");

-- CreateIndex
CREATE INDEX "UserFollowsTopicLog_topicId_idx" ON "public"."UserFollowsTopicLog"("topicId");

-- AddForeignKey
ALTER TABLE "public"."UserFollowsTopicLog" ADD CONSTRAINT "UserFollowsTopicLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserFollowsTopicLog" ADD CONSTRAINT "UserFollowsTopicLog_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "public"."Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
