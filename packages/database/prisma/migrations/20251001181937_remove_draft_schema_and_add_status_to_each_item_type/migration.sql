/*
Warnings:

- The values [PUBLISH] on the enum `BannerStatusType` will be removed. If these variants are still used in the database, this will fail.
- The values [AUDIO] on the enum `PostAttachmentType` will be removed. If these variants are still used in the database, this will fail.
- The values [PUBLISH,DRAFT] on the enum `TopicStatus` will be removed. If these variants are still used in the database, this will fail.
- You are about to drop the `AnnouncementDraft` table. If the table is not empty, all the data it contains will be lost.
- You are about to drop the `AnnouncementFileDraft` table. If the table is not empty, all the data it contains will be lost.
- You are about to drop the `AnnouncementTopicDraft` table. If the table is not empty, all the data it contains will be lost.
- You are about to drop the `PollDraft` table. If the table is not empty, all the data it contains will be lost.
- You are about to drop the `PollOptionDraft` table. If the table is not empty, all the data it contains will be lost.
- You are about to drop the `PollTopicDraft` table. If the table is not empty, all the data it contains will be lost.
- Added the required column `endAt` to the `Banner` table without a default value. This is not possible if the table is not empty.
- Added the required column `startAt` to the `Banner` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."FacebookPageLinkedStatus" AS ENUM ('PENDING', 'UNLINKED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."PollStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."PostStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum
BEGIN;

ALTER TABLE "public"."Banner" ALTER COLUMN "status" TYPE TEXT;

UPDATE "public"."Banner" SET "status" = 'PUBLISHED' WHERE "status" = 'PUBLISH';

CREATE TYPE "public"."BannerStatusType_new" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "public"."Banner" ALTER COLUMN "status" TYPE "public"."BannerStatusType_new" USING ("status"::text::"public"."BannerStatusType_new");

ALTER TYPE "public"."BannerStatusType" RENAME TO "BannerStatusType_old";

ALTER TYPE "public"."BannerStatusType_new" RENAME TO "BannerStatusType";

DROP TYPE "public"."BannerStatusType_old";

COMMIT;

-- AlterEnum
BEGIN;

CREATE TYPE "public"."PostAttachmentType_new" AS ENUM ('IMAGE', 'VIDEO');

ALTER TABLE "public"."PostAttachment" ALTER COLUMN "type" TYPE "public"."PostAttachmentType_new" USING ("type"::text::"public"."PostAttachmentType_new");

ALTER TYPE "public"."PostAttachmentType" RENAME TO "PostAttachmentType_old";

ALTER TYPE "public"."PostAttachmentType_new" RENAME TO "PostAttachmentType";

DROP TYPE "public"."PostAttachmentType_old";

COMMIT;

-- AlterEnum
BEGIN;

ALTER TABLE "public"."Topic" ALTER COLUMN "status" TYPE TEXT;

UPDATE "public"."Topic" SET "status" = 'PUBLISHED' WHERE "status" = 'PUBLISH';

UPDATE "public"."Topic" SET "status" = 'SUSPENDED' WHERE "status" = 'DRAFT';

CREATE TYPE "public"."TopicStatus_new" AS ENUM ('PUBLISHED', 'SUSPENDED');

ALTER TABLE "public"."Topic" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "public"."Topic" ALTER COLUMN "status" TYPE "public"."TopicStatus_new" USING ("status"::text::"public"."TopicStatus_new");

ALTER TYPE "public"."TopicStatus" RENAME TO "TopicStatus_old";

ALTER TYPE "public"."TopicStatus_new" RENAME TO "TopicStatus";

DROP TYPE "public"."TopicStatus_old";

ALTER TABLE "public"."Topic" ALTER COLUMN "status" SET DEFAULT 'SUSPENDED';

COMMIT;

-- DropForeignKey
ALTER TABLE "public"."AnnouncementFileDraft" DROP CONSTRAINT "AnnouncementFileDraft_announcementDraftId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AnnouncementTopicDraft" DROP CONSTRAINT "AnnouncementTopicDraft_announcementDraftId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AnnouncementTopicDraft" DROP CONSTRAINT "AnnouncementTopicDraft_topicId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PollOptionDraft" DROP CONSTRAINT "PollOptionDraft_pollDraftId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PollTopicDraft" DROP CONSTRAINT "PollTopicDraft_pollDraftId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PollTopicDraft" DROP CONSTRAINT "PollTopicDraft_topicId_fkey";

-- AlterTable
ALTER TABLE "public"."Announcement" ADD COLUMN     "status" "public"."AnnouncementStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "public"."Banner" ADD COLUMN     "endAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."FacebookPage" ADD COLUMN     "linkedStatus" "public"."FacebookPageLinkedStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "public"."FeedItem" ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "status" "public"."PostStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "public"."Topic" ALTER COLUMN "status" SET DEFAULT 'SUSPENDED';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE "public"."AnnouncementDraft";

-- DropTable
DROP TABLE "public"."AnnouncementFileDraft";

-- DropTable
DROP TABLE "public"."AnnouncementTopicDraft";

-- DropTable
DROP TABLE "public"."PollDraft";

-- DropTable
DROP TABLE "public"."PollOptionDraft";

-- DropTable
DROP TABLE "public"."PollTopicDraft";