// src/schemas/product/product.create.zod.ts
import { z } from 'zod';
import { NonEmptyString, SlugSchema, MoneySchema } from '../../common/zod';

import {
  ProductTypeEnum,
  GenderEnum,
  AgeGroupEnum,
} from '../../schemas/shared/enums.zod';
import { DynamicAttributeList } from '../attributes/attribute.dynamic.zod';

/** Minimal ProductCreate input shape used by API */
export const ProductCreateInputBase = z.object({
  title: NonEmptyString,
  slug: SlugSchema.optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  type: ProductTypeEnum.optional(),
  gender: GenderEnum.optional(),
  ageGroup: AgeGroupEnum.optional(),
  defaultCurrency: z.string().length(3).optional().default('USD'),
  defaultPrice: MoneySchema.optional(),
  categories: z.array(SlugSchema).min(1), // category slugs

  // Dynamic attributes: validated at runtime via runtimeValidateAttributes
  attributes: DynamicAttributeList.optional(),

  // Variants: harmonized to use priceCents and inventory
  variants: z
    .array(
      z.object({
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
      }),
    )
    .optional(),
});

export const zProductCreateSchema = ProductCreateInputBase;
