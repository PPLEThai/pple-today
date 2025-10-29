/*
Warnings:

- A unique constraint covering the columns `[slug]` on the table `MiniApp` will be added. If there are existing duplicate values, this will fail.
- Added the required column `slug` to the `MiniApp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."MiniApp" ADD COLUMN "slug" TEXT;

UPDATE "public"."MiniApp" SET "slug" = "id";

ALTER TABLE "public"."MiniApp" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "MiniApp_slug_key" ON "public"."MiniApp"("slug");