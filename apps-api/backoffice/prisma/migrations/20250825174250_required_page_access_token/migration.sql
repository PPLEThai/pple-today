/*
  Warnings:

  - Made the column `pageAccessToken` on table `FacebookPage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FacebookPage" ALTER COLUMN "pageAccessToken" SET NOT NULL;
