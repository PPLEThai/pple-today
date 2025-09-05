/*
  Warnings:

  - You are about to drop the column `endDate` on the `Election` table. All the data in the column will be lost.
  - You are about to drop the column `publicKey` on the `Election` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Election` table. All the data in the column will be lost.
  - You are about to drop the column `ballotId` on the `ElectionEligibleBallot` table. All the data in the column will be lost.
  - You are about to drop the column `electionId` on the `ElectionEligibleBallot` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `ElectionEligibleBallot` table. All the data in the column will be lost.
  - You are about to drop the `ElectionBallot` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[voterId]` on the table `ElectionEligibleBallot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `closeVoting` to the `Election` table without a default value. This is not possible if the table is not empty.
  - Added the required column `openVoting` to the `Election` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Election` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encryptedBallot` to the `ElectionEligibleBallot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `faceImageURL` to the `ElectionEligibleBallot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `ElectionEligibleBallot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voterId` to the `ElectionEligibleBallot` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ElectionType" AS ENUM ('ONSITE', 'ONLINE', 'HYBRID');

-- CreateEnum
CREATE TYPE "public"."ElectionResultType" AS ENUM ('ONSITE', 'ONLINE');

-- DropForeignKey
ALTER TABLE "public"."ElectionBallot" DROP CONSTRAINT "ElectionBallot_electionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ElectionEligibleBallot" DROP CONSTRAINT "ElectionEligibleBallot_ballotId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ElectionEligibleBallot" DROP CONSTRAINT "ElectionEligibleBallot_electionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ElectionEligibleBallot" DROP CONSTRAINT "ElectionEligibleBallot_userId_fkey";

-- DropIndex
DROP INDEX "public"."ElectionEligibleBallot_electionId_idx";

-- DropIndex
DROP INDEX "public"."ElectionEligibleBallot_userId_idx";

-- DropIndex
DROP INDEX "public"."ElectionEligibleVoter_electionId_idx";

-- AlterTable
ALTER TABLE "public"."Election" DROP COLUMN "endDate",
DROP COLUMN "publicKey",
DROP COLUMN "startDate",
ADD COLUMN     "closeRegister" TIMESTAMP(3),
ADD COLUMN     "closeVoting" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "endResult" TIMESTAMP(3),
ADD COLUMN     "openRegister" TIMESTAMP(3),
ADD COLUMN     "openVoting" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "publishDate" TIMESTAMP(3),
ADD COLUMN     "startResult" TIMESTAMP(3),
ADD COLUMN     "type" "public"."ElectionType" NOT NULL;

-- AlterTable
ALTER TABLE "public"."ElectionCandidate" ADD COLUMN     "number" INTEGER;

-- AlterTable
ALTER TABLE "public"."ElectionEligibleBallot" DROP COLUMN "ballotId",
DROP COLUMN "electionId",
DROP COLUMN "userId",
ADD COLUMN     "encryptedBallot" TEXT NOT NULL,
ADD COLUMN     "faceImageURL" TEXT NOT NULL,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "voterId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."ElectionBallot";

-- CreateTable
CREATE TABLE "public"."ElectionResult" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "type" "public"."ElectionResultType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ElectionResult_candidateId_type_key" ON "public"."ElectionResult"("candidateId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionEligibleBallot_voterId_key" ON "public"."ElectionEligibleBallot"("voterId");

-- AddForeignKey
ALTER TABLE "public"."ElectionEligibleBallot" ADD CONSTRAINT "ElectionEligibleBallot_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "public"."ElectionEligibleVoter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ElectionResult" ADD CONSTRAINT "ElectionResult_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."ElectionCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
