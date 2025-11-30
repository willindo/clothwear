// src/modules/products/sub-services/product-variants.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ProductInventoryService } from './product-inventory.service';
import { randomUUID } from 'crypto';

const uuidv4 = () => randomUUID();

@Injectable()
export class ProductVariantsService {
  constructor(private readonly inventory: ProductInventoryService) {}

  /**
   * Ensure uniqueness by attribute combinations.
   * Works with DynamicAttributeList.
   */
  ensureUniqueVariants(variants: any[]) {
    const seen = new Set<string>();

    variants.forEach((v, idx) => {
      const key = (v.attributes || [])
        .map((a: any) => `${a.attributeId}:${JSON.stringify(a.value)}`)
        .sort()
        .join('|');

      if (seen.has(key))
        throw new BadRequestException(`Duplicate variant at index ${idx}`);

      seen.add(key);
    });
  }

  /**
   * Transform normalized variants into Prisma-ready shape.
   * Values are JSON/string normalized.
   */
  transformForDb(variants: any[]) {
    return variants.map((v) => ({
      id: v.id ?? uuidv4(),
      sku: v.sku ?? null,
      title: v.title ?? null,

      priceCents: v.priceCents ?? null,
      compareAtPriceCents: v.compareAtPriceCents ?? null,
      barcode: v.barcode ?? null,

      attributes: (v.attributes || []).map((a: any) => ({
        attributeId: a.attributeId,
        value:
          typeof a.value === 'object'
            ? JSON.stringify(a.value)
            : String(a.value),
      })),
    }));
  }

  /**
   * Attach inventory projection to each variant.
   */
  async enrichWithInventory(variants: any[]) {
    return Promise.all(
      variants.map(async (v) => {
        const inv = this.inventory.getVariantInventory(v);
        return { ...v, inventory: inv };
      }),
    );
  }
}
