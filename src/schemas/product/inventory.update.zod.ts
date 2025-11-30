// File: src/schemas/product/inventory.update.zod.ts
import { z } from 'zod';
import { UUIDSchema } from '../shared/id.zod';

/**
 * Inventory update payloads to change quantities or add/remove locations.
 * This is intentionally small and explicit so service-layer logic can handle
 * merging, adjustments and audit entries.
 */
export const InventoryItemUpdate = z.object({
  id: UUIDSchema.optional(), // existing inventory item id (if any)
  location: z.string().optional(),
  quantityOnHand: z.number().int().min(0).optional(),
  // use _op to convey intent: 'set'|'increment'|'decrement'|'delete'
  _op: z.enum(['set', 'increment', 'decrement', 'delete']).optional(),
});

export const InventoryUpdateForVariant = z.object({
  variantId: UUIDSchema,
  updates: z.array(InventoryItemUpdate).min(1),
});

export const InventoryUpdateBatch = z.array(InventoryUpdateForVariant);

export type InventoryUpdateForVariantType = z.infer<
  typeof InventoryUpdateForVariant
>;
