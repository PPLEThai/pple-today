/*
Warnings:

- You are about to drop the column `linkValue` on the `Notification` table. All the data in the column will be lost.

*/
-- CreateEnum
BEGIN;

CREATE TYPE "public"."NotificationInAppType" AS ENUM ('POST', 'POLL', 'TOPIC', 'USER', 'ANNOUNCEMENT', 'ELECTION', 'HASHTAG');

-- AlterTable
ALTER TABLE "public"."Notification"
ADD COLUMN     "linkDestination" TEXT,
ADD COLUMN     "linkInAppId" TEXT,
ADD COLUMN     "linkInAppType" "public"."NotificationInAppType";

UPDATE "public"."Notification"
SET "linkDestination" = CASE
    WHEN "linkType" = 'EXTERNAL_BROWSER' OR "linkType" = 'MINI_APP' THEN "linkValue"
    ELSE NULL
END;

UPDATE "public"."Notification"
SET "linkType" =
  CASE
    WHEN "linkType" = 'IN_APP_NAVIGATION' THEN NULL
    WHEN "linkType" = 'EXTERNAL_BROWSER' THEN 'EXTERNAL_BROWSER'::"NotificationLinkType"
    WHEN "linkType" = 'MINI_APP' THEN 'MINI_APP'::"NotificationLinkType"
  ELSE NULL
END;

ALTER TABLE "public"."Notification" DROP COLUMN "linkValue";

COMMIT;