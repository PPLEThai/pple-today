-- CreateEnum
CREATE TYPE "public"."ElectionOnlineResultStatus" AS ENUM ('NONE', 'COUNTING', 'COUNT_SUCCESS', 'COUNT_FAILED');

-- AlterTable
ALTER TABLE "public"."Election" ADD COLUMN     "onlineResultStatus" "public"."ElectionOnlineResultStatus" NOT NULL DEFAULT 'NONE';
