/*
  Warnings:

  - You are about to drop the column `passportCountry` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "passportCountry",
ADD COLUMN     "passportCountries" JSONB;
