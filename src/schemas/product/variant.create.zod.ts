// src/schemas/product/variant.create.zod.ts
import { z } from 'zod';
import { NonEmptyString } from '../../common/zod';
import { SizeTypeEnum, SizeType } from '../shared/syze-type.zod';
import { CATEGORY_RULES } from './category.rules';
import { DynamicAttributeList } from '../attributes/attribute.dynamic.zod';

/** Basic variant input shape */
export const VariantCreateInputBase = z.object({
  sku: NonEmptyString.optional(),
  title: z.string().optional(),
  priceCents: z.number().int().optional(),
  barcode: z.string().optional(),
  attributes: DynamicAttributeList.optional(),
  inventory: z
    .array(
      z.object({
        location: z.string().optional(),
        quantityOnHand: z.number().int().min(0).default(0),
      }),
    )
    .optional(),
});

/** Runtime helper: enforce sizeType for variants that belong to a category */
export function enforceVariantSizeType(
  categorySlug: string,
  sizeType: SizeType | null,
  variantAttrs: Array<{ attributeSlug: string }>,
) {
  const rule = CATEGORY_RULES[categorySlug];
  if (!rule || !rule.enforceSizeType) return;

  const expected = rule.enforceSizeType;
  if (!sizeType)
    throw new Error(
      `Variant sizeType must be provided for category ${categorySlug}`,
    );
  if (sizeType !== expected) {
    throw new Error(
      `Variant sizeType mismatch. Expected ${expected} for ${categorySlug}`,
    );
  }

  // Optionally ensure that a size attribute exists (e.g., attribute "size" present)
  const hasSize = variantAttrs.some(
    (a) => a.attributeSlug === 'size' || a.attributeSlug === 'shoe_size',
  );
  if (!hasSize)
    throw new Error(
      `Variant must include size attribute for category ${categorySlug}`,
    );
}
