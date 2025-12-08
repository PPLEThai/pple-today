-- CreateTable
CREATE TABLE "public"."MiniAppRole" (
    "role" TEXT NOT NULL,
    "miniAppId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniAppRole_pkey" PRIMARY KEY ("role","miniAppId")
);

-- AddForeignKey
ALTER TABLE "public"."MiniAppRole" ADD CONSTRAINT "MiniAppRole_miniAppId_fkey" FOREIGN KEY ("miniAppId") REFERENCES "public"."MiniApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
