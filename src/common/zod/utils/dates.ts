import { z } from 'zod';

export const ISODate = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), 'Invalid ISO date');

export const OptionalISODate = ISODate.optional();
