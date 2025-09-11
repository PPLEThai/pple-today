/*
  Warnings:

  - Made the column `type` on table `ElectionEligibleVoter` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ElectionEligibleVoter" ALTER COLUMN "type" SET NOT NULL;
