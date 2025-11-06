-- CreateIndex
CREATE INDEX "FeedItem_createdAt_idx" ON "public"."FeedItem"("createdAt");

-- CreateIndex
CREATE INDEX "FeedItemComment_createdAt_idx" ON "public"."FeedItemComment"("createdAt");

-- CreateIndex
CREATE INDEX "FeedItemReaction_createdAt_idx" ON "public"."FeedItemReaction"("createdAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");
