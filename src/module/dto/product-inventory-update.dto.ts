import { z } from 'zod';

/**
 * Update inventory for a product variant
 */
export const ProductInventoryUpdateSchema = z.object({
  variantId: z.string().uuid(),

  stock: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative().optional(),
  incoming: z.number().int().nonnegative().optional(),
});

export type ProductInventoryUpdateDto = z.infer<
  typeof ProductInventoryUpdateSchema
>;
