// prisma/seed/seed-attributes.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function seedAttributes() {
  console.log('Seeding Attributes...');

  const attributes = [
    {
      slug: 'brand',
      name: 'Brand',
      kind: 'TEXT',
    },
    {
      slug: 'size',
      name: 'Size',
      kind: 'SELECT',
      options: ['S', 'M', 'L', 'XL'],
    },
    {
      slug: 'color',
      name: 'Color',
      kind: 'SELECT',
      options: ['Red', 'Blue', 'Black', 'White'],
    },
    {
      slug: 'material',
      name: 'Material',
      kind: 'TEXT',
    },
    {
      slug: 'fit',
      name: 'Fit',
      kind: 'SELECT',
      options: ['Regular', 'Slim', 'Oversized'],
    },
  ];

  for (const attr of attributes) {
    const data = {
      slug: attr.slug,
      name: attr.name,
      kind: attr.kind,
      ...(attr.options !== undefined && { options: attr.options }),
      // ...(attr.pattern !== undefined && { pattern: attr.pattern }),
      // ...(attr.min !== undefined && { min: attr.min }),
      // ...(attr.max !== undefined && { max: attr.max }),
    };

    await prisma.attribute.upsert({
      where: { slug: attr.slug },
      update: data,
      create: data,
    });
  }

  console.log('Attributes seeded.');
}
