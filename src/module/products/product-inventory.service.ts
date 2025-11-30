import { Injectable } from '@nestjs/common';

export interface FutureInventory {
  available: number; // sellable
  reserved: number; // locked for orders
  incoming: number; // incoming POs
  warehouseId?: string; // optional
}

@Injectable()
export class ProductInventoryService {
  // Current system uses `variant.stock` as available. We expose a future-safe API.
  getVariantInventory(variant: any): FutureInventory {
    const available = typeof variant.stock === 'number' ? variant.stock : 0;
    return { available, reserved: 0, incoming: 0 };
  }

  // Aggregate product-level inventory from variants
  calculateProductInventory(variants: FutureInventory[]) {
    return variants.reduce(
      (acc, v) => {
        acc.available += v.available;
        acc.reserved += v.reserved;
        acc.incoming += v.incoming;
        return acc;
      },
      { available: 0, reserved: 0, incoming: 0 },
    );
  }

  // Stubs for reserving/releasing - later will call transactional flows
  reserve(variantId: string, qty: number) {
    // implement later with transactions
    return true;
  }

  release(variantId: string, qty: number) {
    return true;
  }
}
