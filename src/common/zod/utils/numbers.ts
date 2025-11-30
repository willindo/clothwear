import { z } from 'zod';

/** Money must be >= 0 and max 2 decimals */
export const MoneySchema = z
  .number()
  .nonnegative()
  .refine((v) => Number(v.toFixed(2)) === v, {
    message: 'Money must have at most 2 decimals',
  });

/** Positive integer (used for quantity / stock / pagination) */
export const PositiveInt = z.number().int().positive();
