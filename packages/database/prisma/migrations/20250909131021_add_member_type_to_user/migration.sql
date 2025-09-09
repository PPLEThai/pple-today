-- AlterEnum
ALTER TYPE "public"."UserRole" ADD VALUE 'MEMBER';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "responsibleArea" TEXT;
