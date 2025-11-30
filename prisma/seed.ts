import { PrismaClient } from '@prisma/client';
import { seedCategoryAttributes } from './seed/seed-categories';
import { seedAttributes } from './seed/seed-attributes';
import { seedProducts } from './seed/seed-products';

const prisma = new PrismaClient();

async function main() {
  await seedAttributes();
  await seedCategoryAttributes();
  await seedProducts(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
