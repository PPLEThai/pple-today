-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_feedItemId_fkey";

-- DropForeignKey
ALTER TABLE "PostAttachment" DROP CONSTRAINT "PostAttachment_postId_fkey";

-- DropForeignKey
ALTER TABLE "PostHashTag" DROP CONSTRAINT "PostHashTag_hashTagId_fkey";

-- DropForeignKey
ALTER TABLE "PostHashTag" DROP CONSTRAINT "PostHashTag_postId_fkey";

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "FeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAttachment" ADD CONSTRAINT "PostAttachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("feedItemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashTag" ADD CONSTRAINT "PostHashTag_hashTagId_fkey" FOREIGN KEY ("hashTagId") REFERENCES "HashTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashTag" ADD CONSTRAINT "PostHashTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("feedItemId") ON DELETE CASCADE ON UPDATE CASCADE;
