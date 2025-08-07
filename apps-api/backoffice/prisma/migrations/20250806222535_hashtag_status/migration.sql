/*
  Warnings:

  - Added the required column `status` to the `HashTag` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "HashTagStatus" AS ENUM ('PUBLISH', 'SUSPEND');

-- AlterTable
ALTER TABLE "HashTag" ADD COLUMN     "status" "HashTagStatus" NOT NULL;
