-- CreateTable
CREATE TABLE "public"."ElectionNotification" (
    "userId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectionNotification_pkey" PRIMARY KEY ("userId","electionId")
);

-- AddForeignKey
ALTER TABLE "public"."ElectionNotification" ADD CONSTRAINT "ElectionNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ElectionNotification" ADD CONSTRAINT "ElectionNotification_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "public"."Election"("id") ON DELETE CASCADE ON UPDATE CASCADE;
