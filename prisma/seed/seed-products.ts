// prisma/seed/seed-products.ts
import { PrismaClient } from '@prisma/client';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

export async function seedProducts(prisma: PrismaClient) {
  console.log('🌱 Seeding sample Products...');

  // simple product sample using your schema fields (title, slug, description)
  const sample = {
    title: 'Classic Cotton T-Shirt',
    description: 'Soft 100% cotton t-shirt for everyday wear',
    // sellerId: null as string | null,
    defaultPrice: 79900,
    categories: ['mens-tshirts'],
    attributes: [
      { attributeSlug: 'material', value: 'cotton' },
      { attributeSlug: 'fit', value: 'regular' },
    ],
    variants: [
      {
        sku: 'TSHIRT-BLACK-M',
        title: 'Black / M',
        priceCents: 89900,
        attributes: [
          { attributeSlug: 'color', value: 'black' },
          { attributeSlug: 'size', value: 'M' },
        ],
        inventory: [{ location: 'default', quantityOnHand: 25 }],
      },
    ],
  };

  // find category
  const category = await prisma.category.findUnique({
    where: { slug: 'mens-tshirts' },
  });
  if (!category) {
    console.warn('⚠ category mens-tshirts not found — skipping product seed');
    return;
  }

  // create product
  const product = await prisma.product.upsert({
    where: { slug: slugify(sample.title) },
    update: {
      title: sample.title,
      description: sample.description ?? null,
      //   defaultPrice: sample.defaultPrice ?? null,
    },
    create: {
      title: sample.title,
      slug: slugify(sample.title),
      description: sample.description ?? null,
      //   defaultPrice: sample.defaultPrice ?? null,
      //   sellerId: sample.sellerId ?? undefined,
    },
  });

  // link product -> category (ProductCategory)
  await prisma.productCategory.upsert({
    where: {
      productId_categoryId: { productId: product.id, categoryId: category.id },
    },
    update: {},
    create: {
      productId: product.id,
      categoryId: category.id,
    },
  });

  // product-level attributes: productAttribute.value is string
  for (const pa of sample.attributes) {
    const attr = await prisma.attribute.findUnique({
      where: { slug: pa.attributeSlug },
    });
    if (!attr) {
      console.warn('attribute not found', pa.attributeSlug);
      continue;
    }

    await prisma.productAttribute.upsert({
      where: {
        productId_attributeId: { productId: product.id, attributeId: attr.id },
      },
      update: { value: pa.value },
      create: { productId: product.id, attributeId: attr.id, value: pa.value },
    });
  }

  // create variants
  for (const v of sample.variants) {
    const variant = await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {
        title: v.title ?? null,
        priceCents: v.priceCents,
      },
      create: {
        productId: product.id,
        sku: v.sku,
        title: v.title ?? null,
        priceCents: v.priceCents,
      },
    });

    // variant attributes
    for (const va of v.attributes) {
      const attr = await prisma.attribute.findUnique({
        where: { slug: va.attributeSlug },
      });
      if (!attr) {
        console.warn('variant attribute not found', va.attributeSlug);
        continue;
      }

      await prisma.variantAttribute.upsert({
        where: {
          variantId_attributeId: {
            variantId: variant.id,
            attributeId: attr.id,
          },
        },
        update: { value: va.value },
        create: {
          variantId: variant.id,
          attributeId: attr.id,
          value: va.value,
        },
      });
    }

    // inventory items
    for (const it of v.inventory ?? []) {
      await prisma.inventoryItem.create({
        data: {
          variantId: variant.id,
          location: 'default',
          quantityOnHand: it.quantityOnHand ?? 25,
          //   reserved: it.reserved ?? 0,
        },
      });
    }
  }

  console.log('✔ Sample product seeded.');
}
