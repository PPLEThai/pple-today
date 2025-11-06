/*
  Warnings:

  - You are about to drop the column `endAt` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `startAt` on the `Banner` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Banner" DROP COLUMN "endAt",
DROP COLUMN "startAt";
