-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MEMBER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "responsibleArea" TEXT;
