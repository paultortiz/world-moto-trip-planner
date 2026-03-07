/**
 * Main seed runner - executes all seed files
 */

import { PrismaClient } from "@prisma/client";
import { seedVehicleEntryRequirements } from "./vehicleEntryRequirements";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...\n");

  // Run all seeds
  await seedVehicleEntryRequirements();

  // Note: BorderCrossings are no longer seeded - they are populated dynamically
  // from Google Places API when users search for nearby crossings

  console.log("\n✅ All seeds completed successfully!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
