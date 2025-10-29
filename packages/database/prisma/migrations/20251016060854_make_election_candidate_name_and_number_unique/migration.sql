/*
  Warnings:

  - A unique constraint covering the columns `[electionId,name]` on the table `ElectionCandidate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[electionId,number]` on the table `ElectionCandidate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ElectionCandidate_electionId_name_key" ON "public"."ElectionCandidate"("electionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionCandidate_electionId_number_key" ON "public"."ElectionCandidate"("electionId", "number");
