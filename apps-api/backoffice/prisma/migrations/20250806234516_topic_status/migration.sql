-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('PUBLISH', 'DRAFT');

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "status" "TopicStatus" NOT NULL DEFAULT 'DRAFT';
