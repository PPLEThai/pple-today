/*
  Warnings:

  - The primary key for the `Address` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_district_subDistrict_fkey";

-- DropIndex
DROP INDEX "Address_province_district_subDistrict_postalCode_idx";

-- AlterTable
ALTER TABLE "Address" DROP CONSTRAINT "Address_pkey",
ADD CONSTRAINT "Address_pkey" PRIMARY KEY ("province", "district", "subDistrict", "postalCode");

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "province" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_province_district_subDistrict_postalCode_fkey" FOREIGN KEY ("province", "district", "subDistrict", "postalCode") REFERENCES "Address"("province", "district", "subDistrict", "postalCode") ON DELETE SET NULL ON UPDATE CASCADE;
