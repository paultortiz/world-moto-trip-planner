-- CreateEnum
CREATE TYPE "RidingStyle" AS ENUM ('TOURING', 'ADVENTURE', 'OFFROAD', 'SPORT_TOURING');

-- CreateEnum
CREATE TYPE "PacePreference" AS ENUM ('RELAXED', 'MODERATE', 'AGGRESSIVE');

-- CreateEnum
CREATE TYPE "TerrainPreference" AS ENUM ('PAVEMENT_ONLY', 'MIXED', 'OFFROAD_FOCUSED');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avoidHighways" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dailyDistanceKm" INTEGER,
ADD COLUMN     "dietaryRestrictions" TEXT,
ADD COLUMN     "experienceLevel" "ExperienceLevel",
ADD COLUMN     "interests" JSONB,
ADD COLUMN     "pacePreference" "PacePreference",
ADD COLUMN     "preferCamping" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ridingStyle" "RidingStyle",
ADD COLUMN     "terrainPreference" "TerrainPreference";
