-- DropForeignKey
ALTER TABLE "public"."FeedItemComment" DROP CONSTRAINT "FeedItemComment_feedItemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FeedItemReaction" DROP CONSTRAINT "FeedItemReaction_feedItemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FeedItemReactionCount" DROP CONSTRAINT "FeedItemReactionCount_feedItemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FeedItemScore" DROP CONSTRAINT "FeedItemScore_feedItemId_fkey";

-- AddForeignKey
ALTER TABLE "public"."FeedItemScore" ADD CONSTRAINT "FeedItemScore_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "public"."FeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedItemReaction" ADD CONSTRAINT "FeedItemReaction_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "public"."FeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedItemReactionCount" ADD CONSTRAINT "FeedItemReactionCount_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "public"."FeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedItemComment" ADD CONSTRAINT "FeedItemComment_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "public"."FeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
