-- CreateTable
CREATE TABLE "BorderCrossing" (
    "id" TEXT NOT NULL,
    "fromCountry" TEXT NOT NULL,
    "toCountry" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alternateNames" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "is24Hours" BOOLEAN NOT NULL DEFAULT false,
    "hasVehicleProcessing" BOOLEAN NOT NULL DEFAULT true,
    "motorcycleFriendly" BOOLEAN NOT NULL DEFAULT true,
    "pedestrianOnly" BOOLEAN NOT NULL DEFAULT false,
    "typicalWaitMinutes" INTEGER,
    "bestTimeToGo" TEXT,
    "nearestCity" TEXT,
    "facilitiesNotes" TEXT,
    "notes" TEXT,
    "warnings" TEXT,
    "directions" TEXT,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "officialUrl" TEXT,
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorderCrossing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BorderCrossing_fromCountry_toCountry_idx" ON "BorderCrossing"("fromCountry", "toCountry");

-- CreateIndex
CREATE INDEX "BorderCrossing_isRecommended_idx" ON "BorderCrossing"("isRecommended");
