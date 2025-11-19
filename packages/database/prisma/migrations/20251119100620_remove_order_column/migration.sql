/*
  Warnings:

  - You are about to drop the column `order` on the `MiniApp` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."MiniApp_order_idx";

-- AlterTable
ALTER TABLE "public"."MiniApp" DROP COLUMN "order";
