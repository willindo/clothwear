// src/schemas/product/category.rules.ts
import { SizeType } from '../shared/syze-type.zod';

export type CategoryRule = {
  categorySlug: string;
  requiredAttributes?: string[]; // attribute slugs required at product-level
  variantRequiredAttributes?: string[]; // required per variant
  forbiddenAttributes?: string[]; // attributes that must not appear
  enforceSizeType?: SizeType | null;
  enforceAgeGroup?: ('ADULT' | 'TEEN' | 'KIDS' | 'TODDLER' | 'INFANT')[] | null;
};

export const CATEGORY_RULES: Record<string, CategoryRule> = {
  footwear: {
    categorySlug: 'footwear',
    requiredAttributes: ['material', 'primary_use'], // example slugs
    variantRequiredAttributes: ['shoe_size'],
    forbiddenAttributes: ['sleeve_length', 'neck_type'],
    enforceSizeType: 'SHOES',
    enforceAgeGroup: null,
  },

  tops: {
    categorySlug: 'tops',
    requiredAttributes: ['fabric', 'fit'],
    variantRequiredAttributes: ['size'],
    forbiddenAttributes: ['shoe_size'],
    enforceSizeType: 'ALPHA',
    enforceAgeGroup: null,
  },

  kids_clothing: {
    categorySlug: 'kids_clothing',
    requiredAttributes: ['fabric', 'fit'],
    variantRequiredAttributes: ['size'],
    forbiddenAttributes: ['shoe_size'],
    enforceSizeType: 'ALPHA',
    enforceAgeGroup: ['KIDS', 'TODDLER', 'INFANT'],
  },

  // add more categories as needed
};
