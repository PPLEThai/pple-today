/*
Warnings:

- The values [PUBLISH,SUSPEND] on the enum `HashTagStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;

ALTER TABLE "public"."HashTag" ALTER COLUMN "status" TYPE TEXT;

UPDATE "public"."HashTag" SET "status" = 'PUBLISHED' WHERE "status" = 'PUBLISH';

UPDATE "public"."HashTag" SET "status" = 'SUSPENDED' WHERE "status" = 'SUSPEND';

CREATE TYPE "public"."HashTagStatus_new" AS ENUM ('PUBLISHED', 'SUSPENDED');

ALTER TABLE "public"."HashTag" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "public"."HashTag" ALTER COLUMN "status" TYPE "public"."HashTagStatus_new" USING ("status"::text::"public"."HashTagStatus_new");

ALTER TYPE "public"."HashTagStatus" RENAME TO "HashTagStatus_old";

ALTER TYPE "public"."HashTagStatus_new" RENAME TO "HashTagStatus";

DROP TYPE "public"."HashTagStatus_old";

ALTER TABLE "public"."HashTag" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';

COMMIT;

-- AlterTable
ALTER TABLE "public"."HashTag" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "public"."Poll" ADD COLUMN     "status" "public"."PollStatus" NOT NULL DEFAULT 'DRAFT';