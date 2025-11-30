import { z } from 'zod';

/** Ensures a non-empty trimmed string */
export const NonEmptyString = z.string().trim().min(1, 'Required');

/** A safe string that is trimmed but may be empty */
export const SafeString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === '' ? undefined : v));

/** Slug validation (a-z, 0-9, hyphens) */
export const SlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');
