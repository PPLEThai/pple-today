/*
  Warnings:

  - The primary key for the `ElectionResult` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ElectionResult` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."ElectionResult_candidateId_type_key";

-- AlterTable
ALTER TABLE "public"."ElectionResult" DROP CONSTRAINT "ElectionResult_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ElectionResult_pkey" PRIMARY KEY ("candidateId", "type");
