-- DropForeignKey
ALTER TABLE "public"."ElectionBallot" DROP CONSTRAINT "ElectionBallot_electionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ElectionCandidate" DROP CONSTRAINT "ElectionCandidate_electionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ElectionEligibleVoter" DROP CONSTRAINT "ElectionEligibleVoter_electionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ElectionEligibleVoter" DROP CONSTRAINT "ElectionEligibleVoter_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ElectionResult" DROP CONSTRAINT "ElectionResult_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ElectionVoteRecord" DROP CONSTRAINT "ElectionVoteRecord_electionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ElectionVoteRecord" DROP CONSTRAINT "ElectionVoteRecord_userId_fkey";

-- AddForeignKey
ALTER TABLE "public"."ElectionCandidate" ADD CONSTRAINT "ElectionCandidate_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ElectionEligibleVoter" ADD CONSTRAINT "ElectionEligibleVoter_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ElectionEligibleVoter" ADD CONSTRAINT "ElectionEligibleVoter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ElectionVoteRecord" ADD CONSTRAINT "ElectionVoteRecord_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ElectionVoteRecord" ADD CONSTRAINT "ElectionVoteRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ElectionBallot" ADD CONSTRAINT "ElectionBallot_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ElectionResult" ADD CONSTRAINT "ElectionResult_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."ElectionCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
