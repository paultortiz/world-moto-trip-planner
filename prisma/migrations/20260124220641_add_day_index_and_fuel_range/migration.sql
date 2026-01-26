-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "fuelRangeKm" INTEGER,
ADD COLUMN     "fuelReserveKm" INTEGER;

-- AlterTable
ALTER TABLE "Waypoint" ADD COLUMN     "dayIndex" INTEGER;
