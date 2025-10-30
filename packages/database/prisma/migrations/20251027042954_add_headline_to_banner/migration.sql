/*
  Warnings:

  - Added the required column `headline` to the `Banner` table without a default value. This is not possible if the table is not empty.
  - Made the column `bannerImagePath` on table `Topic` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Banner" ADD COLUMN     "headline" TEXT NOT NULL;
