import { z } from 'zod';

export const Nullable = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([schema, z.null(), z.undefined(), z.literal('')])
    .transform((v) => (v === '' || v === null ? undefined : v));
