-- AlterTable
ALTER TABLE "public"."MiniApp" ADD COLUMN     "collaboratorSubs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "unlisted" BOOLEAN NOT NULL DEFAULT false;
