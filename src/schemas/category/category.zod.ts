// src/schemas/category/category.zod.ts
import { z } from 'zod';
import { UUIDSchema } from '../shared/id.zod';
import { SlugSchema, NonEmptyString } from '../../common/zod';

// ----------------------------
// CREATE
// ----------------------------
export const CategoryCreateInput = z.object({
  name: NonEmptyString,
  slug: SlugSchema,
  parentId: UUIDSchema.nullish(), // root categories allowed
  isActive: z.boolean().default(true),
});

// ----------------------------
// UPDATE
// ----------------------------
export const CategoryUpdateInput = z.object({
  name: NonEmptyString.optional(),
  slug: SlugSchema.optional(),
  parentId: UUIDSchema.nullish().optional(),
  isActive: z.boolean().optional(),
});

// ----------------------------
// QUERY (for listing + tree fetch)
// ----------------------------
export const CategoryQueryInput = z.object({
  search: z.string().optional(),
  onlyActive: z.coerce.boolean().optional(),
});
