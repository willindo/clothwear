// src/modules/products/product-attributes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

/**
 * ProductAttributesService
 *
 * - Load attributes attached to a category (UI-friendly shape)
 * - Provide category-level checks (required/allowed attributes)
 * - Provide helper to list variant-allowed attribute slugs
 *
 * Note: This service does NOT perform type validation (validator/pipeline does that).
 */
@Injectable()
export class ProductAttributesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Load all attributes attached to a category (UI-friendly)
   *
   * Returns:
   * [
   *   {
   *     attributeSlug,
   *     attributeId,
   *     name,
   *     required,
   *     variantAllowed,
   *     values: [{ id, value }],
   *     position
   *   }
   * ]
   */
  async loadCategoryAttributes(categorySlug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
      include: {
        categoryAttributes: {
          include: {
            attribute: { include: { values: true } },
          },
          orderBy: { position: 'asc' as const },
        },
      },
    });

    if (!category) throw new NotFoundException('Category not found');

    return (category.categoryAttributes ?? []).map((ca) => ({
      attributeSlug: ca.attribute.slug,
      attributeId: ca.attribute.id,
      name: ca.attribute.name,
      required: ca.required ?? false,
      variantAllowed: ca.variantAllowed ?? false,
      values: (ca.attribute.values ?? []).map((v) => ({
        id: v.id,
        value: v.value,
      })),
      position: ca.position ?? 0,
    }));
  }

  /**
   * Check category-level rules:
   * - required attributes are present
   * - only attached attributes are used
   *
   * Input:
   *  - categoryAttrs: output of loadCategoryAttributes (or same-shaped)
   *  - productAttrs: array of { attributeSlug, value }
   *
   * Returns { ok: boolean, errors?: string[] }
   */
  checkCategoryRules(
    categoryAttrs: Array<{
      attributeSlug: string;
      required?: boolean;
      variantAllowed?: boolean;
    }>,
    productAttrs: Array<{ attributeSlug: string; value: any }>,
  ) {
    const errors: string[] = [];
    const attached = new Map(categoryAttrs.map((c) => [c.attributeSlug, c]));

    // required check
    for (const ca of categoryAttrs) {
      if (ca.required) {
        const present = (productAttrs || []).some(
          (p) => p.attributeSlug === ca.attributeSlug,
        );
        if (!present)
          errors.push(`Missing required attribute: ${ca.attributeSlug}`);
      }
    }

    // allowed check: product attrs must be attached to category
    for (const p of productAttrs || []) {
      if (!attached.has(p.attributeSlug)) {
        errors.push(`Attribute not allowed for category: ${p.attributeSlug}`);
      }
    }

    if (errors.length) return { ok: false, errors };
    return { ok: true };
  }

  /**
   * Return slugs of category attributes that are allowed to be used on variants.
   */
  variantAllowedAttributes(
    categoryAttrs: Array<{ attributeSlug: string; variantAllowed?: boolean }>,
  ) {
    return (categoryAttrs || [])
      .filter((a) => a.variantAllowed)
      .map((a) => a.attributeSlug);
  }
}
