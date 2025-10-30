/*
  Warnings:

  - The values [IN_APP_BROWSER] on the enum `NotificationLinkType` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `UserNotificationToken` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."NotificationLinkType_new" AS ENUM ('MINI_APP', 'IN_APP_NAVIGATION', 'EXTERNAL_BROWSER');
ALTER TABLE "public"."Notification" ALTER COLUMN "linkType" TYPE "public"."NotificationLinkType_new" USING ("linkType"::text::"public"."NotificationLinkType_new");
ALTER TYPE "public"."NotificationLinkType" RENAME TO "NotificationLinkType_old";
ALTER TYPE "public"."NotificationLinkType_new" RENAME TO "NotificationLinkType";
DROP TYPE "public"."NotificationLinkType_old";
COMMIT;

-- DropIndex
DROP INDEX "public"."UserNotificationToken_userId_idx";

-- AlterTable
ALTER TABLE "public"."UserNotificationToken" DROP CONSTRAINT "UserNotificationToken_pkey",
ADD CONSTRAINT "UserNotificationToken_pkey" PRIMARY KEY ("token");
