/*
  Warnings:

  - You are about to drop the column `bannerId` on the `MiniApp` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Banner_miniAppId_key";

-- DropIndex
DROP INDEX "public"."MiniApp_bannerId_key";

-- AlterTable
ALTER TABLE "public"."MiniApp" DROP COLUMN "bannerId";
