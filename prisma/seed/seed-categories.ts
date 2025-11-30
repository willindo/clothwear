// prisma/seed/seed-category-attributes.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function seedCategoryAttributes() {
  console.log('Seeding CategoryAttributes for Mens Tshirts...');

  // Fetch category
  const category = await prisma.category.findUnique({
    where: { slug: 'mens-tshirts' },
  });

  if (!category) {
    throw new Error("Category 'mens-tshirts' not found.");
  }

  // Fetch attributes
  const brand = await prisma.attribute.findUnique({ where: { slug: 'brand' } });
  const size = await prisma.attribute.findUnique({ where: { slug: 'size' } });
  const color = await prisma.attribute.findUnique({ where: { slug: 'color' } });
  const material = await prisma.attribute.findUnique({
    where: { slug: 'material' },
  });
  const fit = await prisma.attribute.findUnique({ where: { slug: 'fit' } });

  const list = [
    {
      attributeId: brand!.id,
      required: false,
      variantAllowed: false,
      position: 1,
    },
    {
      attributeId: size!.id,
      required: true,
      variantAllowed: true,
      position: 2,
    },
    {
      attributeId: color!.id,
      required: true,
      variantAllowed: true,
      position: 3,
    },
    {
      attributeId: material!.id,
      required: false,
      variantAllowed: false,
      position: 4,
    },
    {
      attributeId: fit!.id,
      required: false,
      variantAllowed: false,
      position: 5,
    },
  ];

  for (const item of list) {
    await prisma.categoryAttribute.upsert({
      where: {
        categoryId_attributeId: {
          categoryId: category.id,
          attributeId: item.attributeId,
        },
      },
      update: {
        required: item.required,
        variantAllowed: item.variantAllowed,
        position: item.position,
      },
      create: {
        categoryId: category.id,
        attributeId: item.attributeId,
        required: item.required,
        variantAllowed: item.variantAllowed,
        position: item.position,
      },
    });
  }

  console.log('CategoryAttributes seeded for Mens Tshirts.');
}
