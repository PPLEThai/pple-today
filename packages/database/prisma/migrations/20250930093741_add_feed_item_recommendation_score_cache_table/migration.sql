-- CreateTable
CREATE TABLE "public"."FeedItemScore" (
    "userId" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedItemScore_pkey" PRIMARY KEY ("userId","feedItemId")
);

-- CreateIndex
CREATE INDEX "FeedItemScore_feedItemId_idx" ON "public"."FeedItemScore"("feedItemId");

-- CreateIndex
CREATE INDEX "FeedItemScore_userId_idx" ON "public"."FeedItemScore"("userId");

-- AddForeignKey
ALTER TABLE "public"."FeedItemScore" ADD CONSTRAINT "FeedItemScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedItemScore" ADD CONSTRAINT "FeedItemScore_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "public"."FeedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
