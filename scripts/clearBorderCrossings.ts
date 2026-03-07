import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.borderCrossing.deleteMany();
  console.log(`Deleted ${result.count} border crossing records`);
}

main()
  .finally(() => prisma.$disconnect());
