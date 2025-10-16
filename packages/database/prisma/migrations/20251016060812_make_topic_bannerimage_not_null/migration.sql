/*
  Warnings:

  - Made the column `bannerImagePath` on table `Topic` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Topic" ALTER COLUMN "bannerImagePath" SET NOT NULL;
