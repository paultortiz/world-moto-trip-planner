-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "motorcycleId" TEXT;

-- CreateTable
CREATE TABLE "Motorcycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "displayName" TEXT,
    "engineDisplacementCc" INTEGER,
    "wetWeightKg" INTEGER,
    "fuelCapacityLiters" DOUBLE PRECISION,
    "estimatedRangeKm" INTEGER,
    "seatHeightMm" INTEGER,
    "offroadBias" DOUBLE PRECISION,
    "highwayComfort" DOUBLE PRECISION,
    "specs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motorcycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Motorcycle_userId_year_make_model_idx" ON "Motorcycle"("userId", "year", "make", "model");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_motorcycleId_fkey" FOREIGN KEY ("motorcycleId") REFERENCES "Motorcycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Motorcycle" ADD CONSTRAINT "Motorcycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
