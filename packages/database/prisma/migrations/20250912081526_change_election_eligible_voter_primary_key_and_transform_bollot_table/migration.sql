/*
  Warnings:

  - The primary key for the `ElectionEligibleVoter` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ElectionEligibleVoter` table. All the data in the column will be lost.
  - You are about to drop the `ElectionEligibleBallot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ElectionEligibleBallot" DROP CONSTRAINT "ElectionEligibleBallot_voterId_fkey";

-- AlterTable
ALTER TABLE "public"."Election" ADD COLUMN     "encryptionPublicKey" TEXT,
ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."ElectionEligibleVoter" DROP CONSTRAINT "ElectionEligibleVoter_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ElectionEligibleVoter_pkey" PRIMARY KEY ("electionId", "userId");

-- DropTable
DROP TABLE "public"."ElectionEligibleBallot";

-- CreateTable
CREATE TABLE "public"."ElectionVoteRecord" (
    "electionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ballotId" TEXT,
    "location" TEXT,
    "faceImagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionVoteRecord_pkey" PRIMARY KEY ("electionId","userId")
);

-- CreateTable
CREATE TABLE "public"."ElectionBallot" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "encryptedBallot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionBallot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ElectionVoteRecord_ballotId_key" ON "public"."ElectionVoteRecord"("ballotId");

-- CreateIndex
CREATE INDEX "ElectionVoteRecord_userId_idx" ON "public"."ElectionVoteRecord"("userId");

-- CreateIndex
CREATE INDEX "ElectionBallot_electionId_idx" ON "public"."ElectionBallot"("electionId");

-- CreateIndex
CREATE INDEX "ElectionCandidate_electionId_idx" ON "public"."ElectionCandidate"("electionId");

-- AddForeignKey
ALTER TABLE "public"."ElectionVoteRecord" ADD CONSTRAINT "ElectionVoteRecord_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ElectionVoteRecord" ADD CONSTRAINT "ElectionVoteRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ElectionVoteRecord" ADD CONSTRAINT "ElectionVoteRecord_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "public"."ElectionBallot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ElectionBallot" ADD CONSTRAINT "ElectionBallot_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
