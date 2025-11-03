-- AlterTable
BEGIN;

-- Step 1: change type from number to text
ALTER TABLE "public"."Banner" ALTER COLUMN "order" DROP DEFAULT,
ALTER COLUMN "order" TYPE TEXT USING "order"::TEXT;

-- Step 2: transform old numeric values to lexorank format
UPDATE "public"."Banner" SET "order" = '0|' || LPAD("order", 6, '0') || ':';

COMMIT;
