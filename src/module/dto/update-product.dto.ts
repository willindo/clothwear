import { z } from 'zod';
import { zProductUpdateSchema } from 'src/schemas/product/product.update.zod';

export type UpdateProductDto = z.infer<typeof zProductUpdateSchema>;
