/*
  Warnings:

  - You are about to drop the column `backgroundColor` on the `Announcement` table. All the data in the column will be lost.
  - You are about to drop the column `iconImage` on the `Announcement` table. All the data in the column will be lost.
  - You are about to drop the column `backgroundColor` on the `AnnouncementDraft` table. All the data in the column will be lost.
  - You are about to drop the column `iconImage` on the `AnnouncementDraft` table. All the data in the column will be lost.
  - You are about to drop the column `profileImage` on the `ElectionCandidate` table. All the data in the column will be lost.
  - You are about to drop the column `profilePictureUrl` on the `FacebookPage` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `PostAttachment` table. All the data in the column will be lost.
  - You are about to drop the column `bannerImage` on the `Topic` table. All the data in the column will be lost.
  - You are about to drop the column `profileImage` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `AboutUs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventAttendant` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `profilePicturePath` to the `FacebookPage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attachmentPath` to the `PostAttachment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."EventAttendant" DROP CONSTRAINT "EventAttendant_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventAttendant" DROP CONSTRAINT "EventAttendant_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Announcement" DROP COLUMN "backgroundColor",
DROP COLUMN "iconImage";

-- AlterTable
ALTER TABLE "public"."AnnouncementDraft" DROP COLUMN "backgroundColor",
DROP COLUMN "iconImage";

-- AlterTable
ALTER TABLE "public"."ElectionCandidate" RENAME "profileImage" TO "profileImagePath";

-- AlterTable
ALTER TABLE "public"."FacebookPage" RENAME "profilePictureUrl" TO "profilePicturePath";

-- AlterTable
ALTER TABLE "public"."PostAttachment" RENAME "url" TO "attachmentPath";

-- AlterTable
ALTER TABLE "public"."Topic" RENAME "bannerImage" TO "bannerImagePath";

-- AlterTable
ALTER TABLE "public"."User" RENAME "profileImage" TO "profileImagePath";

-- DropTable
DROP TABLE "public"."AboutUs";

-- DropTable
DROP TABLE "public"."Event";

-- DropTable
DROP TABLE "public"."EventAttendant";

-- DropEnum
DROP TYPE "public"."EventAttendantStatus";
