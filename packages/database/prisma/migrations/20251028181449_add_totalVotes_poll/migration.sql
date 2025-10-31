-- AlterTable
ALTER TABLE "public"."Poll" ADD COLUMN     "totalVotes" INTEGER NOT NULL DEFAULT 0;

-- UpdateTable
UPDATE "Poll"
SET "totalVotes" = COALESCE(
  (SELECT COUNT(DISTINCT pa."userId")
   FROM "PollOption" po
   JOIN "PollAnswer" pa ON pa."optionId" = po."id"
   WHERE po."pollId" = "Poll"."feedItemId"
  ),
  0
)
