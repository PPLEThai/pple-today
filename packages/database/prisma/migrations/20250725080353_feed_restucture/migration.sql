/*
  Warnings:

  - You are about to drop the `FeedItemFile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FeedItemHashTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FeedItemImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FeedItemTopic` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FeedItemFile" DROP CONSTRAINT "FeedItemFile_feedItemId_fkey";

-- DropForeignKey
ALTER TABLE "FeedItemHashTag" DROP CONSTRAINT "FeedItemHashTag_feedItemId_fkey";

-- DropForeignKey
ALTER TABLE "FeedItemHashTag" DROP CONSTRAINT "FeedItemHashTag_hashTagId_fkey";

-- DropForeignKey
ALTER TABLE "FeedItemImage" DROP CONSTRAINT "FeedItemImage_feedItemId_fkey";

-- DropForeignKey
ALTER TABLE "FeedItemTopic" DROP CONSTRAINT "FeedItemTopic_feedItemId_fkey";

-- DropForeignKey
ALTER TABLE "FeedItemTopic" DROP CONSTRAINT "FeedItemTopic_topicId_fkey";

-- DropTable
DROP TABLE "FeedItemFile";

-- DropTable
DROP TABLE "FeedItemHashTag";

-- DropTable
DROP TABLE "FeedItemImage";

-- DropTable
DROP TABLE "FeedItemTopic";

-- CreateTable
CREATE TABLE "AnnouncementTopic" (
    "announcementId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementTopic_pkey" PRIMARY KEY ("announcementId","topicId")
);

-- CreateTable
CREATE TABLE "AnnouncementFile" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementTopicDraft" (
    "announcementDraftId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementTopicDraft_pkey" PRIMARY KEY ("announcementDraftId","topicId")
);

-- CreateTable
CREATE TABLE "AnnouncementFileDraft" (
    "id" TEXT NOT NULL,
    "announcementDraftId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnouncementFileDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollTopic" (
    "pollId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PollTopic_pkey" PRIMARY KEY ("pollId","topicId")
);

-- CreateTable
CREATE TABLE "PollTopicDraft" (
    "pollDraftId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PollTopicDraft_pkey" PRIMARY KEY ("pollDraftId","topicId")
);

-- CreateTable
CREATE TABLE "PostImage" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostHashTag" (
    "postId" TEXT NOT NULL,
    "hashTagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostHashTag_pkey" PRIMARY KEY ("postId","hashTagId")
);

-- CreateIndex
CREATE INDEX "AnnouncementFile_announcementId_idx" ON "AnnouncementFile"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementFileDraft_announcementDraftId_idx" ON "AnnouncementFileDraft"("announcementDraftId");

-- AddForeignKey
ALTER TABLE "AnnouncementTopic" ADD CONSTRAINT "AnnouncementTopic_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("feedItemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTopic" ADD CONSTRAINT "AnnouncementTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementFile" ADD CONSTRAINT "AnnouncementFile_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("feedItemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTopicDraft" ADD CONSTRAINT "AnnouncementTopicDraft_announcementDraftId_fkey" FOREIGN KEY ("announcementDraftId") REFERENCES "AnnouncementDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTopicDraft" ADD CONSTRAINT "AnnouncementTopicDraft_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementFileDraft" ADD CONSTRAINT "AnnouncementFileDraft_announcementDraftId_fkey" FOREIGN KEY ("announcementDraftId") REFERENCES "AnnouncementDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollTopic" ADD CONSTRAINT "PollTopic_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("feedItemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollTopic" ADD CONSTRAINT "PollTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollTopicDraft" ADD CONSTRAINT "PollTopicDraft_pollDraftId_fkey" FOREIGN KEY ("pollDraftId") REFERENCES "PollDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollTopicDraft" ADD CONSTRAINT "PollTopicDraft_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("feedItemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashTag" ADD CONSTRAINT "PostHashTag_hashTagId_fkey" FOREIGN KEY ("hashTagId") REFERENCES "HashTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostHashTag" ADD CONSTRAINT "PostHashTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("feedItemId") ON DELETE RESTRICT ON UPDATE CASCADE;
