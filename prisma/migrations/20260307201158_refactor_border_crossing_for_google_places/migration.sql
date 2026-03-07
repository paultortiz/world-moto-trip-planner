/*
  Warnings:

  - You are about to drop the column `alternateNames` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `directions` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `facilitiesNotes` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `hasVehicleProcessing` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `is24Hours` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `isRecommended` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `lastVerified` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `motorcycleFriendly` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `nearestCity` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `officialUrl` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `pedestrianOnly` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `popularity` on the `BorderCrossing` table. All the data in the column will be lost.
  - You are about to drop the column `typicalWaitMinutes` on the `BorderCrossing` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[googlePlaceId]` on the table `BorderCrossing` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `googlePlaceId` to the `BorderCrossing` table without a default value. This is not possible if the table is not empty.

*/
-- Delete all existing data (switching from curated seed data to Google Places cache)
DELETE FROM "BorderCrossing";

-- DropIndex
DROP INDEX "BorderCrossing_fromCountry_toCountry_name_key";

-- DropIndex
DROP INDEX "BorderCrossing_isRecommended_idx";

-- AlterTable
ALTER TABLE "BorderCrossing" DROP COLUMN "alternateNames",
DROP COLUMN "directions",
DROP COLUMN "facilitiesNotes",
DROP COLUMN "hasVehicleProcessing",
DROP COLUMN "is24Hours",
DROP COLUMN "isRecommended",
DROP COLUMN "lastVerified",
DROP COLUMN "motorcycleFriendly",
DROP COLUMN "nearestCity",
DROP COLUMN "notes",
DROP COLUMN "officialUrl",
DROP COLUMN "pedestrianOnly",
DROP COLUMN "popularity",
DROP COLUMN "typicalWaitMinutes",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "googlePlaceId" TEXT NOT NULL,
ADD COLUMN     "lastAiEnhanced" TIMESTAMP(3),
ADD COLUMN     "lastFetched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "motorcycleTips" TEXT,
ADD COLUMN     "openingHours" JSONB,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "photoReferences" JSONB,
ADD COLUMN     "placeTypes" JSONB,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "tipProcessInfo" TEXT,
ADD COLUMN     "userRatingsTotal" INTEGER,
ADD COLUMN     "websiteUrl" TEXT,
ALTER COLUMN "fromCountry" DROP NOT NULL,
ALTER COLUMN "toCountry" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BorderCrossing_googlePlaceId_key" ON "BorderCrossing"("googlePlaceId");

-- CreateIndex
CREATE INDEX "BorderCrossing_lat_lng_idx" ON "BorderCrossing"("lat", "lng");
