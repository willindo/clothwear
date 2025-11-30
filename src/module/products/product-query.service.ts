import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductQueryService {
  // Flatten product + variants into a search-index friendly document
  buildSearchDocument(product: any, variants: any[]) {
    const inStock = variants.reduce(
      (s, v) => s + (v.inventory?.available ?? v.stock ?? 0),
      0,
    );

    const productAttributes = (product.attributes || []).map(
      (a: any) => `${a.attributeSlug}:${a.value}`,
    );
    const variantAttributes = variants.flatMap((v) =>
      (v.attributes || []).map((a: any) => `${a.attributeSlug}:${a.value}`),
    );

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      slug: product.slug,
      price: product.price ?? null,
      categoryId: product.categoryId,
      categorySlug: product.categorySlug,
      attributes: productAttributes,
      variantAttributes: variantAttributes,
      inStock,
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        price: v.price,
        stock: v.inventory?.available ?? v.stock ?? 0,
      })),
    };
  }
}
