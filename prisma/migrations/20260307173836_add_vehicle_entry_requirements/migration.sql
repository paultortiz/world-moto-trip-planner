-- CreateTable
CREATE TABLE "VehicleEntryRequirement" (
    "id" TEXT NOT NULL,
    "destCountry" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "tipRequired" BOOLEAN NOT NULL DEFAULT true,
    "tipCostUsd" DOUBLE PRECISION,
    "tipValidityDays" INTEGER,
    "tipObtainAt" TEXT,
    "tipAgency" TEXT,
    "tipUrl" TEXT,
    "tipDocuments" JSONB,
    "tipNotes" TEXT,
    "tipProcessingDays" INTEGER,
    "carnetRequired" BOOLEAN NOT NULL DEFAULT false,
    "carnetAccepted" BOOLEAN NOT NULL DEFAULT true,
    "carnetIssuers" JSONB,
    "carnetNotes" TEXT,
    "carnetProcessingWeeks" INTEGER,
    "depositRequired" BOOLEAN NOT NULL DEFAULT false,
    "depositAmountUsd" DOUBLE PRECISION,
    "depositRefundable" BOOLEAN NOT NULL DEFAULT true,
    "depositNotes" TEXT,
    "insuranceRequired" BOOLEAN NOT NULL DEFAULT true,
    "insuranceNotes" TEXT,
    "sourceUrl" TEXT,
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleEntryRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleEntryRequirement_destCountry_key" ON "VehicleEntryRequirement"("destCountry");

-- CreateIndex
CREATE INDEX "VehicleEntryRequirement_destCountry_idx" ON "VehicleEntryRequirement"("destCountry");
