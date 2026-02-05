-- AlterTable
ALTER TABLE "Motorcycle" ADD COLUMN     "preferredRangeKm" INTEGER,
ADD COLUMN     "preferredReserveKm" INTEGER;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "fuelAutoFromMotorcycle" BOOLEAN DEFAULT true;
