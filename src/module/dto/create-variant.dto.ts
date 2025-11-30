// src/modules/products/dto/variant-create.dto.ts
import { z } from 'zod';
import { DynamicAttributeList } from '../../schemas/attributes/attribute.dynamic.zod';

/**
 * API DTO (used by controllers) — canonical shape aligned with Zod + Service.
 * Use priceCents (integer) as the canonical money field.
 */
export const VariantCreateSchema = z.object({
  sku: z.string().min(1).optional(),
  title: z.string().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  compareAtPriceCents: z.number().int().nonnegative().optional(),
  barcode: z.string().optional(),

  // inventory: array of { location?, quantityOnHand }
  inventory: z
    .array(
      z.object({
        location: z.string().optional(),
        quantityOnHand: z.number().int().min(0).default(0),
      }),
    )
    .optional(),

  // Must use dynamic attribute engine (same as product schemas)
  attributes: DynamicAttributeList.optional(),
});

export type VariantCreateDto = z.infer<typeof VariantCreateSchema>;
