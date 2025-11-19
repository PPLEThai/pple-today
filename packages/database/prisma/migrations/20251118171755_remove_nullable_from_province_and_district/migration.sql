/*
Warnings:

- Made the column `district` on table `Election` required. This step will fail if there are existing NULL values in that column.
- Made the column `province` on table `Election` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable

BEGIN;

UPDATE "public"."Election" SET "province" = 'กรุงเทพมหานคร' WHERE "province" IS NULL;

UPDATE "public"."Election" SET "district" = 'กรุงเทพมหานคร' WHERE "district" IS NULL;

ALTER TABLE "public"."Election" ALTER COLUMN "district" SET NOT NULL,
  ALTER COLUMN "province" SET NOT NULL;

COMMIT;