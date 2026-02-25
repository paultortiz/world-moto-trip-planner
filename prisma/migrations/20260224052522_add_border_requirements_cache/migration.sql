-- CreateTable
CREATE TABLE "BorderRequirementsCache" (
    "id" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL,
    "destCountry" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorderRequirementsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BorderRequirementsCache_originCountry_destCountry_idx" ON "BorderRequirementsCache"("originCountry", "destCountry");

-- CreateIndex
CREATE UNIQUE INDEX "BorderRequirementsCache_originCountry_destCountry_key" ON "BorderRequirementsCache"("originCountry", "destCountry");
