-- CreateTable
CREATE TABLE "public"."ElectionInvalidBallot" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionInvalidBallot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ElectionInvalidBallot" ADD CONSTRAINT "ElectionInvalidBallot_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;
