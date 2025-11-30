// src/modules/products/product-base.service.ts
// -----------------------------------------------------------------------------
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductBaseService {
  sanitizeString(s?: string) {
    return (s || '').trim();
  }

  ensureArray<T>(v?: T | T[]) {
    if (!v) return [] as T[];
    return Array.isArray(v) ? v : [v];
  }

  // shallow clone and strip undefined
  compactObject<T extends Record<string, any>>(obj: T): Partial<T> {
    const out: Partial<T> = {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v !== undefined) (out as any)[k] = v;
    }
    return out;
  }
}
