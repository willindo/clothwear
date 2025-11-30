import { z } from 'zod';
import { zProductCreateSchema } from 'src/schemas/product/product.create.zod';

export type CreateProductDto = z.infer<typeof zProductCreateSchema>;
