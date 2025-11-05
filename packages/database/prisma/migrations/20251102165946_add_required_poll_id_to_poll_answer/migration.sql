BEGIN;
-- AlterTable
ALTER TABLE "public"."PollAnswer" ADD COLUMN     "pollId" TEXT;

-- CreateIndex
CREATE INDEX "PollAnswer_pollId_idx" ON "public"."PollAnswer"("pollId");

-- AddForeignKey
ALTER TABLE "public"."PollAnswer" ADD CONSTRAINT "PollAnswer_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "public"."Poll"("feedItemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate the existed pollId
UPDATE "public"."PollAnswer" pa
SET "pollId" = po."pollId"
FROM "public"."PollOption" po
WHERE pa."optionId" = po."id";

-- Update pollId to required
ALTER TABLE "public"."PollAnswer" ALTER COLUMN "pollId" SET NOT NULL;

COMMIT;
