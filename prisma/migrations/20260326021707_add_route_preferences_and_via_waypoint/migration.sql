-- AlterEnum
ALTER TYPE "WaypointType" ADD VALUE 'VIA';

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "routeAvoidFerries" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "routeAvoidHighways" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "routeAvoidTolls" BOOLEAN NOT NULL DEFAULT false;
