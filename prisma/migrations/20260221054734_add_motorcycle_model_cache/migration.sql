-- CreateTable
CREATE TABLE "MotorcycleModelCache" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "models" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotorcycleModelCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MotorcycleModelCache_make_key" ON "MotorcycleModelCache"("make");

-- CreateIndex
CREATE INDEX "MotorcycleModelCache_make_idx" ON "MotorcycleModelCache"("make");
