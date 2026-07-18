-- CreateTable
CREATE TABLE "public"."MiniAppUser" (
    "miniAppId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiniAppUser_pkey" PRIMARY KEY ("miniAppId","userId")
);

-- AddForeignKey
ALTER TABLE "public"."MiniAppUser" ADD CONSTRAINT "MiniAppUser_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MiniAppUser" ADD CONSTRAINT "MiniAppUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
