/*
  Warnings:

  - A unique constraint covering the columns `[fromCountry,toCountry,name]` on the table `BorderCrossing` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BorderCrossing_fromCountry_toCountry_name_key" ON "BorderCrossing"("fromCountry", "toCountry", "name");
