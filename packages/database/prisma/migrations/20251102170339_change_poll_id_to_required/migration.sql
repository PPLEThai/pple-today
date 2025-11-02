/*
  Warnings:

  - Made the column `pollId` on table `PollAnswer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."PollAnswer" ALTER COLUMN "pollId" SET NOT NULL;
