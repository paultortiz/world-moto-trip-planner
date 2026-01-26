-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "earliestDepartureHour" INTEGER,
ADD COLUMN     "latestArrivalHour" INTEGER,
ADD COLUMN     "plannedDailyRideHours" INTEGER;
