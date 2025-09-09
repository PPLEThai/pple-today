/*
  Warnings:

  - You are about to drop the column `iconImage` on the `AboutUs` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `AboutUs` table. All the data in the column will be lost.
  - Added the required column `iconImageUrl` to the `AboutUs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `AboutUs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AboutUs" DROP COLUMN "iconImage",
DROP COLUMN "name",
ADD COLUMN     "iconImageUrl" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;
