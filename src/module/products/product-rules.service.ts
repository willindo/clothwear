import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ProductRulesService {
  // enforceCategoryRules(primaryCategorySlug, productAttrs, variantAttrs)
  enforceCategoryRules(
    categoryAttrs: any[],
    productAttrs: any[],
    variantAttrs: any[],
  ) {
    // categoryAttrs: loaded shape from ProductAttributesService.loadCategoryAttributes
    // productAttrs: [{ attributeSlug, value }]
    // variantAttrs: [[ { attributeSlug, value } ], ...]
    if (!categoryAttrs.length) return true;

    const errors: string[] = [];
    const variantAllowed = new Set(
      categoryAttrs.filter((a) => a.variantAllowed).map((a) => a.attributeSlug),
    );

    // product attrs already validated by ProductAttributesService - assume done earlier

    // Validate variants
    variantAttrs.forEach((variant, idx) => {
      for (const a of variant) {
        if (!variantAllowed.has(a.attributeSlug)) {
          errors.push(
            `Variant ${idx}: attribute not allowed as variant attribute -> ${a.attributeSlug}`,
          );
        }
      }

      // uniqueness of attribute keys in variant
      const keys = variant.map((v: any) => v.attributeSlug);
      const dup = keys.find((k: string, i: number) => keys.indexOf(k) !== i);
      if (dup) errors.push(`Variant ${idx}: duplicate attribute key ${dup}`);
    });

    if (errors.length)
      throw new BadRequestException({ message: errors.join('; ') });

    // Additional custom rules placeholder (combinatoric rules, disallowed combos)
    // e.g. if categoryAttrs contains a 'size' and 'fit' we could block some combos here
    return true;
  }
}
