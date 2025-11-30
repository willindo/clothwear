import { z } from 'zod';

/**
 * Update Category (Zod Schema)
 * Only modifies fields provided
 */
export const CategoryUpdateSchema = z.object({
  categoryId: z.string().uuid(),

  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  parentId: z.string().uuid().optional(),
});

export type CategoryUpdateDto = z.infer<typeof CategoryUpdateSchema>;
