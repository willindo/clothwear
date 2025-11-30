import { ZodError } from 'zod';

export function formatZodError(error: ZodError) {
  return error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }));
}
