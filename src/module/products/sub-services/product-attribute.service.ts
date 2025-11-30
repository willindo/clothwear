// src/modules/products/sub-services/product-attribute.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AttributeDefinitionSchema } from '../../../common/zod/attributes/attribute.definition.zod';
import {
  validateAndNormalizeAttributes,
  AttributeInput,
  AttributeDef as ValidatorAttributeDef,
} from '../../attributes/utils/attribute.validator';

export type NormalizedAttr = {
  attributeId: string;
  attributeSlug: string;
  value: any;
};

/**
 * ProductAttributeService
 *
 * - Fetch attribute defs (lightweight DB-to-validator shape)
 * - Normalize product-level attribute inputs using shared validator
 * - Convert normalized attrs into Prisma-ready rows
 */
@Injectable()
export class ProductAttributeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch attribute definitions for a list of attribute references (id/slug).
   * Returns items shaped to match AttributeDefinitionSchema used by validators.
   */
  async fetchAttributeDefinitions(
    attributeInputs: Array<{ attributeId?: string; attributeSlug?: string }>,
  ): Promise<ValidatorAttributeDef[]> {
    if (!attributeInputs || attributeInputs.length === 0) return [];

    const ids = new Set<string>();
    const slugs = new Set<string>();

    for (const ai of attributeInputs) {
      if (ai.attributeId) ids.add(ai.attributeId);
      if (ai.attributeSlug) slugs.add(ai.attributeSlug);
    }

    const whereClauses: any[] = [];
    if (ids.size) whereClauses.push({ id: { in: Array.from(ids) } });
    if (slugs.size) whereClauses.push({ slug: { in: Array.from(slugs) } });

    if (whereClauses.length === 0) return [];

    const defsFromDb = await this.prisma.attribute.findMany({
      where: { OR: whereClauses },
    });

    if (!defsFromDb || defsFromDb.length === 0) {
      throw new BadRequestException(
        'No attribute definitions found for provided attributes',
      );
    }

    // Cast/normalize DB records into the validator's expected shape.
    // Keep only fields validator needs.
    const normalized = defsFromDb.map((d) => {
      const candidate = {
        id: d.id,
        slug: d.slug,
        name: d.name,
        kind: d.kind,
        options: d.options ?? undefined,
        pattern: d.pattern ?? undefined,
        // validators do not need createdAt/min/max top-level (we keep options.min/max)
      };
      // Validate shape quickly (optional): use zod to ensure it's consistent
      const parsed = AttributeDefinitionSchema.safeParse(candidate);
      if (!parsed.success) {
        // If DB contains invalid definition, surface a helpful error.
        throw new BadRequestException(
          `Invalid attribute definition stored for slug='${d.slug}'`,
        );
      }
      return parsed.data;
    });

    return normalized as ValidatorAttributeDef[];
  }

  /**
   * Validate and normalize product-level dynamic attributes.
   * Uses the shared validator (validateAndNormalizeAttributes).
   */
  async normalizeProductAttributes(
    attributeInputs: AttributeInput[] = [],
  ): Promise<NormalizedAttr[]> {
    if (!attributeInputs || attributeInputs.length === 0) return [];

    // Build minimal lookup list to fetch defs
    const lookup = attributeInputs.map((a) => ({
      attributeId: a.attributeId,
      attributeSlug: a.attributeSlug,
    }));

    const defs = await this.fetchAttributeDefinitions(lookup);

    // Delegate to shared validator which will throw on first invalid input
    let normalized: NormalizedAttr[];
    try {
      normalized = validateAndNormalizeAttributes(defs as any, attributeInputs);
    } catch (err: any) {
      // Convert to BadRequestException with friendly message
      const message = err?.message ?? 'Invalid attribute input';
      throw new BadRequestException(message);
    }

    return normalized;
  }

  /**
   * Convert normalized attributes into Prisma-compatible payload rows.
   *
   * - If productId is provided, rows will carry productId
   * - If variantId is provided, rows will carry variantId
   *
   * Values that are objects/arrays are JSON-stringified to persist in DB.
   */
  toPrismaCreatePayload(
    normalizedAttrs: Array<{
      attributeId: string;
      attributeSlug?: string;
      value: any;
    }>,
    options?: { productId?: string; variantId?: string },
  ): Array<Record<string, any>> {
    const { productId, variantId } = options ?? {};
    return normalizedAttrs.map((a) => {
      const base: Record<string, any> = {
        attributeId: a.attributeId,
        // Persist primitive values as-is; objects/arrays as JSON
        value:
          a.value === null || a.value === undefined
            ? null
            : typeof a.value === 'object'
              ? JSON.stringify(a.value)
              : a.value,
      };
      if (productId) base.productId = productId;
      if (variantId) base.variantId = variantId;
      return base;
    });
  }
}
