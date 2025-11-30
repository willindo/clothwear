// prisma/middleware/slug.middleware.ts
import { PrismaClient } from '@prisma/client';

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export function applySlugMiddleware(prisma: any /* PrismaClient */) {
  // Use any to avoid TS signature mismatches across prisma versions
  prisma.$use(async (params: any, next: any) => {
    const slugModels = ['Category', 'Attribute', 'AttributeGroup', 'Product'];

    if (
      slugModels.includes(params.model ?? '') &&
      (params.action === 'create' || params.action === 'update')
    ) {
      const data: any = params.args.data ?? {};
      if (data.name && !data.slug) {
        data.slug = toSlug(data.name);
      }
      // Also support title -> slug for Product if the code uses 'title'
      if (params.model === 'Product' && data.title && !data.slug) {
        data.slug = toSlug(data.title);
      }
    }

    return next(params);
  });
}
