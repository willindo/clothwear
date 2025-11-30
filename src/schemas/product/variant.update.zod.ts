// File: src/schemas/product/variant.update.zod.ts
import { z } from 'zod';
import { UUIDSchema } from '../shared/id.zod';
import { DynamicAttributeList } from '../attributes/attribute.dynamic.zod';

export const VariantUpdateInput = z.object({
  id: UUIDSchema, // required to identify which variant to update
  sku: z.string().optional(),
  title: z.string().optional(),
  priceCents: z.number().int().optional(),
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

export const VariantUpdateList = z.array(VariantUpdateInput);

export type VariantUpdateInputType = z.infer<typeof VariantUpdateInput>;
