/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `Trip` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Trip_shareToken_key" ON "Trip"("shareToken");
