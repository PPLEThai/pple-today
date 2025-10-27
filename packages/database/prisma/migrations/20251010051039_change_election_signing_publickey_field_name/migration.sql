/*
  Warnings:

  - You are about to drop the column `digitalSignaturePublicKey` on the `Election` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Election" DROP COLUMN "digitalSignaturePublicKey",
ADD COLUMN     "signingPublicKey" TEXT;
