// src/modules/products/sub-services/category-rule.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { enforceCategoryRules } from '../../../schemas/product/product.helpers';
import { CATEGORY_RULES } from '../../../schemas/product/category.rules';

/**
 * CategoryRuleService - enforces category-specific rules before product persist.
 *
 * Usage:
 * await categoryRuleService.enforceForProduct(primaryCategorySlug, productAttrs, variantAttrsList, sizeType?)
 */
@Injectable()
export class CategoryRuleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Load category by slug or id and return slug
   */
  async resolveCategorySlug(categoryIdentifier: {
    id?: string;
    slug?: string;
  }) {
    if (categoryIdentifier.slug) return categoryIdentifier.slug;

    if (categoryIdentifier.id) {
      const cat = await this.prisma.category.findUnique({
        where: { id: categoryIdentifier.id },
        select: { slug: true },
      });
      if (!cat) throw new NotFoundException('Category not found');
      return cat.slug;
    }

    throw new BadRequestException('Category id or slug required');
  }

  /**
   * productAttrs: Array<{ attributeSlug }>
   * variantAttrsList: Array<Array<{ attributeSlug }>>
   *
   * This validates:
   * - required product-level attributes
   * - required variant-level attributes
   * - forbidden attributes
   *
   * Throws BadRequestException on failure.
   */
  async enforceForProduct(
    categoryIdentifier: { id?: string; slug?: string },
    productAttrs: Array<{ attributeSlug: string }>,
    variantAttrsList: Array<Array<{ attributeSlug: string }>> = [],
  ) {
    // Resolve slug
    const slug = await this.resolveCategorySlug(categoryIdentifier);

    // First check hard-coded CATEGORY_RULES (fast path)
    const rule = CATEGORY_RULES[slug];
    if (rule) {
      try {
        enforceCategoryRules(slug, productAttrs || [], variantAttrsList || []);
      } catch (err: unknown) {
        throw new BadRequestException(
          (err as Error).message || 'Category rules violation',
        );
      }
      return;
    }

    // If no static rule, optionally load dynamic rules from DB (if you later store them)
    // For now, simply return (no rule)
    return;
  }

  /**
   * Utility: derive variant attribute slug lists from normalized attributes
   */
  static variantAttrsFromNormalized(
    normalizedVariantAttrs: Array<{ attributeSlug: string }>,
  ) {
    return normalizedVariantAttrs.map((a) => ({
      attributeSlug: a.attributeSlug,
    }));
  }
}
