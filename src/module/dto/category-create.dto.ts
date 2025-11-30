import { z } from 'zod';

/**
 * Create Category (Zod Schema)
 * Supports nested categories via optional parentId
 */
export const CategoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().min(1, 'Slug is required'),

  parentId: z.string().uuid().optional(),
});

export type CategoryCreateDto = z.infer<typeof CategoryCreateSchema>;
