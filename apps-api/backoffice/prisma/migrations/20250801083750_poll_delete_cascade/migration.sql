-- DropForeignKey
ALTER TABLE "Poll" DROP CONSTRAINT "Poll_feedItemId_fkey";

-- DropForeignKey
ALTER TABLE "PollOption" DROP CONSTRAINT "PollOption_pollId_fkey";

-- DropForeignKey
ALTER TABLE "PollOptionDraft" DROP CONSTRAINT "PollOptionDraft_pollDraftId_fkey";

-- DropForeignKey
ALTER TABLE "PollTopic" DROP CONSTRAINT "PollTopic_pollId_fkey";

-- DropForeignKey
ALTER TABLE "PollTopic" DROP CONSTRAINT "PollTopic_topicId_fkey";

-- DropForeignKey
ALTER TABLE "PollTopicDraft" DROP CONSTRAINT "PollTopicDraft_pollDraftId_fkey";

-- DropForeignKey
ALTER TABLE "PollTopicDraft" DROP CONSTRAINT "PollTopicDraft_topicId_fkey";

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "FeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("feedItemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollTopic" ADD CONSTRAINT "PollTopic_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("feedItemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollTopic" ADD CONSTRAINT "PollTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollOptionDraft" ADD CONSTRAINT "PollOptionDraft_pollDraftId_fkey" FOREIGN KEY ("pollDraftId") REFERENCES "PollDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollTopicDraft" ADD CONSTRAINT "PollTopicDraft_pollDraftId_fkey" FOREIGN KEY ("pollDraftId") REFERENCES "PollDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollTopicDraft" ADD CONSTRAINT "PollTopicDraft_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
