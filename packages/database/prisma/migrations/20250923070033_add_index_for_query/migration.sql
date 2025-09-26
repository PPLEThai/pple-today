-- CreateIndex
CREATE INDEX "FeedItemComment_feedItemId_idx" ON "public"."FeedItemComment"("feedItemId");

-- CreateIndex
CREATE INDEX "FeedItemComment_userId_idx" ON "public"."FeedItemComment"("userId");

-- CreateIndex
CREATE INDEX "FeedItemReaction_feedItemId_idx" ON "public"."FeedItemReaction"("feedItemId");

-- CreateIndex
CREATE INDEX "FeedItemReaction_userId_idx" ON "public"."FeedItemReaction"("userId");

-- CreateIndex
CREATE INDEX "HashTagInTopic_hashTagId_idx" ON "public"."HashTagInTopic"("hashTagId");

-- CreateIndex
CREATE INDEX "HashTagInTopic_topicId_idx" ON "public"."HashTagInTopic"("topicId");

-- CreateIndex
CREATE INDEX "PostHashTag_postId_idx" ON "public"."PostHashTag"("postId");

-- CreateIndex
CREATE INDEX "PostHashTag_hashTagId_idx" ON "public"."PostHashTag"("hashTagId");

-- CreateIndex
CREATE INDEX "UserFollowsTopic_userId_idx" ON "public"."UserFollowsTopic"("userId");

-- CreateIndex
CREATE INDEX "UserFollowsTopic_topicId_idx" ON "public"."UserFollowsTopic"("topicId");

-- CreateIndex
CREATE INDEX "UserFollowsUser_followerId_idx" ON "public"."UserFollowsUser"("followerId");

-- CreateIndex
CREATE INDEX "UserFollowsUser_followedId_idx" ON "public"."UserFollowsUser"("followedId");
