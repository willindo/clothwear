// src/modules/products/dto/variant-update.dto.ts
import { z } from 'zod';
import { UUIDSchema } from '../../schemas/shared/id.zod';
import { DynamicAttributeList } from '../../schemas/attributes/attribute.dynamic.zod';

export const VariantUpdateSchema = z.object({
  variantId: UUIDSchema, // for controller-level single-variant update

  sku: z.string().min(1).optional(),
  title: z.string().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  compareAtPriceCents: z.number().int().nonnegative().optional(),
  barcode: z.string().optional(),

  attributes: DynamicAttributeList.optional(),

  inventory: z
    .array(
      z.object({
        id: UUIDSchema.optional(),
        location: z.string().optional(),
        quantityOnHand: z.number().int().min(0).optional(),
        _delete: z.boolean().optional(),
      }),
    )
    .optional(),
});

export type VariantUpdateDto = z.infer<typeof VariantUpdateSchema>;
