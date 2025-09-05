-- AlterTable
ALTER TABLE "User" ADD COLUMN     "district" TEXT,
ADD COLUMN     "numberOfFollowingTopics" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onBoardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subDistrict" TEXT;

-- CreateTable
CREATE TABLE "Address" (
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "subDistrict" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("district","subDistrict")
);

-- CreateIndex
CREATE INDEX "Address_province_district_subDistrict_postalCode_idx" ON "Address"("province", "district", "subDistrict", "postalCode");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_district_subDistrict_fkey" FOREIGN KEY ("district", "subDistrict") REFERENCES "Address"("district", "subDistrict") ON DELETE SET NULL ON UPDATE CASCADE;
