-- CreateEnum
CREATE TYPE "public"."ElectionKeysStatus" AS ENUM ('NOT_CREATED', 'PENDING_CREATED', 'CREATED', 'FAILED_CREATED', 'DESTROY_SCHEDULED');

-- AlterTable
ALTER TABLE "public"."Election" ADD COLUMN     "keysDestroyScheduledAt" TIMESTAMP(3),
ADD COLUMN     "keysDestroyScheduledDuration" INTEGER,
ADD COLUMN     "keysStatus" "public"."ElectionKeysStatus" NOT NULL DEFAULT 'NOT_CREATED';
