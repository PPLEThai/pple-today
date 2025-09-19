-- CreateEnum
CREATE TYPE "public"."ElectionMode" AS ENUM ('SECURE', 'FLEXIBLE');

-- AlterTable
ALTER TABLE "public"."Election" ADD COLUMN     "mode" "public"."ElectionMode" NOT NULL DEFAULT 'SECURE';
