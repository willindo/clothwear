// src/modules/products/sub-services/product-variant.service.ts
import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { enforceVariantSizeType } from '../../../schemas/product/variant.create.zod';
import { ProductAttributeService } from './product-attribute.service';

@Injectable()
export class ProductVariantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attrService: ProductAttributeService,
  ) {}

  /**
   * Prepare variants for product create.
   * Fully aligned with VariantCreateDto.
   */
  async prepareVariantsForCreate(
    variantsInput: Array<any> = [],
    opts: { categorySlug?: string; sizeType?: string | null } = {},
  ) {
    if (!variantsInput || variantsInput.length === 0) return [];

    // 1. PRE-VALIDATE SKUs
    const skus = variantsInput.map((v) => v.sku).filter(Boolean);
    if (skus.length > 0) {
      const existing = await this.prisma.productVariant.findMany({
        where: { sku: { in: skus } },
        select: { sku: true },
      });
      if (existing.length > 0)
        throw new ConflictException(
          `Variant SKU(s) already exist: ${existing.map((e) => e.sku).join(', ')}`,
        );
    }

    const prepared: Array<any> = [];

    // 2. LOOP THROUGH VARIANTS
    for (const v of variantsInput) {
      // 2A. Normalize attributes
      const attributesInput = (v.attributes ?? []).map((a: any) => ({
        attributeId: a.attributeId,
        attributeSlug: a.attributeSlug,
        value: a.value,
      }));

      const normalizedAttrs =
        await this.attrService.normalizeProductAttributes(attributesInput);

      // 2B. Category size-type enforcement
      if (opts.categorySlug) {
        const variantAttrSlugs = normalizedAttrs.map((na) => ({
          attributeSlug: na.attributeSlug,
        }));

        const normalizedSizeType = opts.sizeType
          ? (opts.sizeType.toUpperCase() as
              | 'ALPHA'
              | 'NUMERIC'
              | 'SHOES'
              | 'FREE')
          : null;

        enforceVariantSizeType(
          opts.categorySlug,
          normalizedSizeType,
          variantAttrSlugs,
        );
      }

      // 2C. Price fields (DTO-canonical)
      const priceCents =
        v.priceCents !== undefined
          ? Number(v.priceCents)
          : v.price !== undefined
            ? Math.round(Number(v.price) * 100)
            : undefined;

      const compareAtCents =
        v.compareAtCents !== undefined
          ? Number(v.compareAtCents)
          : v.compareAtPrice !== undefined
            ? Math.round(Number(v.compareAtPrice) * 100)
            : undefined;
      // 2D. Attributes → Prisma payload
      const attrCreatePayload = normalizedAttrs.map((na) => ({
        attributeId: na.attributeId,
        value:
          typeof na.value === 'object'
            ? JSON.stringify(na.value)
            : String(na.value),
      }));

      // 2E. Inventory items
      const inventoryPayload = (v.inventory || []).map((it: any) => ({
        location: it.location ?? null,
        quantityOnHand: Number(it.quantityOnHand ?? 0),
      }));

      // 2F. Final variant
      prepared.push({
        sku: v.sku,
        title: v.title ?? null,

        // use the newly computed values
        priceCents: priceCents ?? undefined,
        compareAtCents: compareAtCents ?? undefined,

        barcode: v.barcode ?? null,

        attributes:
          attrCreatePayload.length > 0
            ? { createMany: { data: attrCreatePayload } }
            : undefined,
        inventoryItems:
          inventoryPayload.length > 0
            ? { create: inventoryPayload }
            : undefined,
      });
    }

    return prepared;
  }

  /**
   * Prepare variant updates.
   * Fully aligned with VariantUpdateDto.
   */
  async prepareVariantChanges(
    variantInputs: Array<any> = [],
    opts: { categorySlug?: string; sizeType?: string | null } = {},
  ) {
    const toCreate: any[] = [];
    const toUpdate: any[] = [];
    const toDelete: string[] = [];

    for (const vi of variantInputs) {
      const variantId = vi.variantId; // canonical

      // DELETE
      if (vi._delete && variantId) {
        toDelete.push(variantId);
        continue;
      }

      // CREATE (no variantId)
      if (!variantId) {
        const prepared = await this.prepareVariantsForCreate([vi], opts);
        toCreate.push(...prepared);
        continue;
      }

      // UPDATE
      const existing = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!existing)
        throw new BadRequestException(`Variant not found: ${variantId}`);

      const updatePayload: any = {};

      if (vi.sku !== undefined) updatePayload.sku = vi.sku;
      if (vi.title !== undefined) updatePayload.title = vi.title;
      if (vi.priceCents !== undefined) updatePayload.priceCents = vi.priceCents;
      if (vi.compareAtPriceCents !== undefined)
        updatePayload.compareAtPriceCents = vi.compareAtPriceCents;

      if (vi.barcode !== undefined) updatePayload.barcode = vi.barcode;

      // ATTRIBUTES update (delete/recreate)
      if (vi.attributes) {
        const normalized = await this.attrService.normalizeProductAttributes(
          vi.attributes,
        );
        const attrCreatePayload = normalized.map((na) => ({
          attributeId: na.attributeId,
          value:
            typeof na.value === 'object'
              ? JSON.stringify(na.value)
              : String(na.value),
        }));
        updatePayload.attributes = {
          deleteMany: {},
          createMany: { data: attrCreatePayload },
        };
      }

      // INVENTORY update (simple replace)
      if (vi.inventory) {
        const invPayload = (vi.inventory || []).map((it: any) => ({
          location: it.location ?? null,
          quantityOnHand: Number(it.quantityOnHand ?? 0),
        }));
        updatePayload.inventoryItems = {
          deleteMany: {},
          create: invPayload,
        };
      }

      toUpdate.push({ id: variantId, data: updatePayload });
    }

    return { toCreate, toUpdate, toDelete };
  }
}
