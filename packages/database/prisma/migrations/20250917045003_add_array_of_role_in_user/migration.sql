/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "role",
ADD COLUMN     "roles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropEnum
DROP TYPE "public"."UserRole";
