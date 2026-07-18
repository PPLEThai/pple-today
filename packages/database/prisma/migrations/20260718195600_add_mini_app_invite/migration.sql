-- CreateEnum
CREATE TYPE "public"."MiniAppInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "public"."MiniAppInvite" (
    "miniAppId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "status" "public"."MiniAppInviteStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "MiniAppInvite_pkey" PRIMARY KEY ("miniAppId","phoneNumber")
);

-- CreateIndex
CREATE INDEX "MiniAppInvite_userId_idx" ON "public"."MiniAppInvite"("userId");

-- CreateIndex
CREATE INDEX "MiniAppInvite_phoneNumber_idx" ON "public"."MiniAppInvite"("phoneNumber");

-- AddForeignKey
ALTER TABLE "public"."MiniAppInvite" ADD CONSTRAINT "MiniAppInvite_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiniAppInvite" ADD CONSTRAINT "MiniAppInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
