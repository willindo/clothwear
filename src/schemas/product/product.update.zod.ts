// File: src/schemas/product/product.update.zod.ts
import { z } from 'zod';
import { ProductCreateInputBase } from './product.create.zod';
import { UUIDSchema } from '../shared/id.zod';
import { DynamicAttributeList } from '../attributes/attribute.dynamic.zod';

/**
 * ProductUpdate should allow partial updates of the base create input,
 * but keep certain constraints when present (e.g. categories must be non-empty array).
 */
export const ProductUpdateInput = ProductCreateInputBase.partial().extend({
  // When updating categories, require at least one slug if provided
  categories: z
    .array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))
    .min(1)
    .optional(),
  // allow updating dynamic attributes using the dynamic attribute list
  attributes: DynamicAttributeList.optional(),
  // variants might be a mixture of create/update/delete operations;
  // here we model a simple update payload where each item has an optional id
  // if id present -> update, if absent -> create
  variants: z
    .array(
      z
        .object({
          id: UUIDSchema.optional(),
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
              }),
            )
            .optional(),
          _delete: z.boolean().optional(), // client may mark for deletion
        })
        .strict(),
    )
    .optional(),
});

export const zProductUpdateSchema = ProductUpdateInput;
