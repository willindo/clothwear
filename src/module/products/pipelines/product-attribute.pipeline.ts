// src/modules/products/pipelines/product-attribute.pipeline.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { z } from 'zod';
import { AttributeDefinitionSchema } from '../../../common/zod/attributes/attribute.definition.zod';
import { validateAndNormalizeAttributes } from '../../attributes/utils/attribute.validator';
import { enforceCategoryRules } from '../../../schemas/product/product.helpers';

type AttributeDef = z.infer<typeof AttributeDefinitionSchema>;

export type NormalizedAttribute = {
  attributeId: string;
  attributeSlug: string;
  value: any;
};

@Injectable()
export class ProductAttributePipeline {
  constructor(private prisma: PrismaService) {}

  /**
   * Collect attribute ids & slugs referenced directly in payload or attached to categories.
   * Returns array of AttributeDef loaded from DB (may be empty).
   */
  private async loadAttributeDefinitionsForPayload(payload: {
    productAttributes?: Array<{
      attributeId?: string;
      attributeSlug?: string;
      value?: any;
    }>;
    variantAttributes?: Array<
      Array<{ attributeId?: string; attributeSlug?: string; value?: any }>
    >;
    categorySlugs?: string[];
  }): Promise<AttributeDef[]> {
    const ids = new Set<string>();
    const slugs = new Set<string>();

    // gather from product attributes
    for (const a of payload.productAttributes ?? []) {
      if (a.attributeId) ids.add(a.attributeId);
      if (a.attributeSlug) slugs.add(a.attributeSlug);
    }

    // gather from each variant attributes
    for (const vaList of payload.variantAttributes ?? []) {
      for (const a of vaList ?? []) {
        if (a.attributeId) ids.add(a.attributeId);
        if (a.attributeSlug) slugs.add(a.attributeSlug);
      }
    }

    // gather from categories -> categoryAttributes -> attribute
    if ((payload.categorySlugs?.length ?? 0) > 0) {
      const categories = await this.prisma.category.findMany({
        where: { slug: { in: payload.categorySlugs } },
        include: { categoryAttributes: { include: { attribute: true } } },
      });

      for (const c of categories) {
        for (const ca of c.categoryAttributes ?? []) {
          const attr = ca.attribute;
          if (!attr) continue;
          if (attr.id) ids.add(attr.id);
          if (attr.slug) slugs.add(attr.slug);
        }
      }
    }

    // Build where clause only if we have something to query
    const whereClauses: any[] = [];
    if (ids.size) whereClauses.push({ id: { in: Array.from(ids) } });
    if (slugs.size) whereClauses.push({ slug: { in: Array.from(slugs) } });

    if (!whereClauses.length) return [];

    const attributeDefs = await this.prisma.attribute.findMany({
      where: { OR: whereClauses },
    });

    // Cast to AttributeDef (we rely on DB shape matching AttributeDefinitionSchema)
    return attributeDefs.map((row) => AttributeDefinitionSchema.parse(row));
  }

  /**
   * Main processing entry
   *
   * Input:
   *  - productAttributes: optional dynamic list for product-level attributes
   *  - variantAttributes: optional array (one entry per variant) of attribute lists
   *  - categorySlugs: categories product belongs to (slugs)
   *
   * Output:
   * {
   *   productAttributes: Array<{ attributeId, attributeSlug, value }>,
   *   variantAttributes: Array<Array<{ attributeId, attributeSlug, value }>>
   * }
   */
  async process(input: {
    productAttributes?: Array<{
      attributeId?: string;
      attributeSlug?: string;
      value?: any;
    }>;
    variantAttributes?: Array<
      Array<{ attributeId?: string; attributeSlug?: string; value?: any }>
    >;
    categorySlugs: string[];
  }): Promise<{
    productAttributes: NormalizedAttribute[];
    variantAttributes: NormalizedAttribute[][];
  }> {
    // load defs used by payload or attached to categories
    const attributeDefs = await this.loadAttributeDefinitionsForPayload({
      productAttributes: input.productAttributes,
      variantAttributes: input.variantAttributes,
      categorySlugs: input.categorySlugs,
    });

    // normalize input shape for validator
    const prodAttrsInput = (input.productAttributes ?? []).map((a) => ({
      attributeId: a.attributeId,
      attributeSlug: a.attributeSlug,
      value: a.value,
    }));

    const variantAttrsInputs = (input.variantAttributes ?? []).map((list) =>
      (list ?? []).map((a) => ({
        attributeId: a.attributeId,
        attributeSlug: a.attributeSlug,
        value: a.value,
      })),
    );

    // Validate & normalize using shared validator
    const normalizedProductAttrs: NormalizedAttribute[] =
      validateAndNormalizeAttributes(attributeDefs, prodAttrsInput);

    const normalizedVariantAttrs: NormalizedAttribute[][] =
      variantAttrsInputs.map((list) =>
        validateAndNormalizeAttributes(attributeDefs, list),
      );

    // Build simple lists of slugs for category rule enforcement
    const productAttrSlugs = normalizedProductAttrs.map((p) => ({
      attributeSlug: p.attributeSlug,
    }));
    const variantAttrSlugsList = normalizedVariantAttrs.map((list) =>
      list.map((v) => ({ attributeSlug: v.attributeSlug })),
    );

    // Enforce category rules per category (may throw user-friendly errors)
    for (const catSlug of input.categorySlugs) {
      enforceCategoryRules(catSlug, productAttrSlugs, variantAttrSlugsList);
    }

    return {
      productAttributes: normalizedProductAttrs,
      variantAttributes: normalizedVariantAttrs,
    };
  }
}
