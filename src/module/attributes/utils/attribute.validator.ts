// src/modules/attributes/utils/attribute.validator.ts
// ===================================================
// FINAL VERSION — fully aligned with:
// 1) attribute.definition.zod.ts
// 2) attribute.factory.ts

import { z } from 'zod';
import { AttributeDefinitionSchema } from '../../../common/zod/attributes/attribute.definition.zod';
import {
  validateAttributeValue,
  createAttributeValueSchema,
} from '../../../common/zod/attributes/attribute.factory';

/**
 * Final Type:
 * - Matches EXACTLY the final AttributeDefinitionSchema
 */
export type AttributeDef = z.infer<typeof AttributeDefinitionSchema>;

/**
 * Input Shape:
 * Provided by product/variant create/update DTO.
 */
export interface AttributeInput {
  attributeId?: string;
  attributeSlug?: string;
  value: unknown;
}

/**
 * Return Shape:
 * Normalized form consumed by Prisma product creation/update.
 */
export interface NormalizedAttribute {
  attributeId: string;
  attributeSlug: string;
  value: any;
}

/**
 * validateAndNormalizeAttributes
 * --------------------------------
 * - Ensures attribute exists (by id or slug)
 * - Validates value using final createAttributeValueSchema()
 * - Returns normalized list of values safe for DB insertion
 */
export function validateAndNormalizeAttributes(
  attributeDefs: AttributeDef[],
  inputs: AttributeInput[],
): NormalizedAttribute[] {
  //
  // Build lookups
  //
  const byId = new Map<string, AttributeDef>();
  const bySlug = new Map<string, AttributeDef>();

  for (const def of attributeDefs) {
    if (def.id) byId.set(def.id, def);
    bySlug.set(def.slug, def);
  }

  const normalized: NormalizedAttribute[] = [];

  //
  // Process each incoming input
  //
  for (const input of inputs) {
    const def =
      (input.attributeId && byId.get(input.attributeId)) ||
      (input.attributeSlug && bySlug.get(input.attributeSlug || ''));

    if (!def) {
      throw new Error(
        `Unknown attribute: ${input.attributeId ?? input.attributeSlug}`,
      );
    }

    //
    // Validate value using the FINAL Zod engine
    //
    let parsedValue: any;
    try {
      parsedValue = validateAttributeValue(def as any, input.value);
    } catch (err: any) {
      const msg = err?.message || 'Invalid attribute value';
      throw new Error(`Invalid value for attribute '${def.slug}': ${msg}`);
    }

    //
    // Push normalized result
    //
    normalized.push({
      attributeId: def.id!, // safe: attribute defs always have id in DB
      attributeSlug: def.slug,
      value: parsedValue,
    });
  }

  return normalized;
}
