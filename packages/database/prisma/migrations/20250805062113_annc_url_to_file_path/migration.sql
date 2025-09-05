/*
  Warnings:

  - You are about to drop the column `url` on the `AnnouncementFile` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `AnnouncementFileDraft` table. All the data in the column will be lost.
  - Added the required column `filePath` to the `AnnouncementFile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filePath` to the `AnnouncementFileDraft` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_feedItemId_fkey";

-- DropForeignKey
ALTER TABLE "AnnouncementFile" DROP CONSTRAINT "AnnouncementFile_announcementId_fkey";

-- DropForeignKey
ALTER TABLE "AnnouncementFileDraft" DROP CONSTRAINT "AnnouncementFileDraft_announcementDraftId_fkey";

-- DropForeignKey
ALTER TABLE "AnnouncementTopic" DROP CONSTRAINT "AnnouncementTopic_announcementId_fkey";

-- DropForeignKey
ALTER TABLE "AnnouncementTopic" DROP CONSTRAINT "AnnouncementTopic_topicId_fkey";

-- DropForeignKey
ALTER TABLE "AnnouncementTopicDraft" DROP CONSTRAINT "AnnouncementTopicDraft_announcementDraftId_fkey";

-- DropForeignKey
ALTER TABLE "AnnouncementTopicDraft" DROP CONSTRAINT "AnnouncementTopicDraft_topicId_fkey";

-- AlterTable
ALTER TABLE "AnnouncementFile" DROP COLUMN "url",
ADD COLUMN     "filePath" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AnnouncementFileDraft" DROP COLUMN "url",
ADD COLUMN     "filePath" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "FeedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTopic" ADD CONSTRAINT "AnnouncementTopic_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("feedItemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTopic" ADD CONSTRAINT "AnnouncementTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementFile" ADD CONSTRAINT "AnnouncementFile_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("feedItemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTopicDraft" ADD CONSTRAINT "AnnouncementTopicDraft_announcementDraftId_fkey" FOREIGN KEY ("announcementDraftId") REFERENCES "AnnouncementDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTopicDraft" ADD CONSTRAINT "AnnouncementTopicDraft_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementFileDraft" ADD CONSTRAINT "AnnouncementFileDraft_announcementDraftId_fkey" FOREIGN KEY ("announcementDraftId") REFERENCES "AnnouncementDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
