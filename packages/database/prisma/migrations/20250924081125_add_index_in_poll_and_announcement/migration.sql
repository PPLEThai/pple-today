-- CreateIndex
CREATE INDEX "AnnouncementTopic_topicId_idx" ON "public"."AnnouncementTopic"("topicId");

-- CreateIndex
CREATE INDEX "AnnouncementTopic_announcementId_idx" ON "public"."AnnouncementTopic"("announcementId");

-- CreateIndex
CREATE INDEX "PollTopic_topicId_idx" ON "public"."PollTopic"("topicId");

-- CreateIndex
CREATE INDEX "PollTopic_pollId_idx" ON "public"."PollTopic"("pollId");
