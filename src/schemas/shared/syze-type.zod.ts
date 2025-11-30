import { z } from 'zod';

export const SizeTypeEnum = z.enum(['ALPHA', 'NUMERIC', 'SHOES', 'FREE']);

export type SizeType = z.infer<typeof SizeTypeEnum>;
