// src/schemas/product/product.helpers.ts
// =======================================
// FINAL VERSION — fully aligned with:
// - attribute.definition.zod.ts
// - attribute.factory.ts

import { z } from 'zod';
import { AttributeDefinitionSchema } from '../../common/zod/attributes/attribute.definition.zod';
import { validateAttributeValue } from '../../common/zod/attributes/attribute.factory';
import { CATEGORY_RULES } from './category.rules';

export type AttributeDef = z.infer<typeof AttributeDefinitionSchema>;

/* -------------------------------------------------------------------------- */
/* Map attribute definitions by id + slug                                     */
/* -------------------------------------------------------------------------- */
export function buildAttrMaps(attributeDefs: AttributeDef[]) {
  const byId = new Map<string, AttributeDef>();
  const bySlug = new Map<string, AttributeDef>();

  for (const def of attributeDefs) {
    if (def.id) byId.set(def.id, def);
    bySlug.set(def.slug, def);
  }

  return { byId, bySlug };
}

/* -------------------------------------------------------------------------- */
/* Runtime attribute validation using final Zod engines                       */
/* -------------------------------------------------------------------------- */
export function runtimeValidateAttributes(
  attributeDefs: AttributeDef[],
  values: Array<{
    attributeId?: string;
    attributeSlug?: string;
    value: any;
  }>,
) {
  const { byId, bySlug } = buildAttrMaps(attributeDefs);

  //
  // Resolve each incoming value to (def, value)
  //
  const resolved = values.map((v) => {
    const def =
      (v.attributeId && byId.get(v.attributeId)) ||
      (v.attributeSlug && bySlug.get(v.attributeSlug));

    if (!def)
      throw new Error(`Unknown attribute: ${v.attributeId ?? v.attributeSlug}`);

    return { def, value: v.value };
  });

  //
  // Validate via final validated engine (factory)
  //
  return resolved.map(({ def, value }) => {
    let parsed: any;

    try {
      parsed = validateAttributeValue(def, value);
    } catch (err: any) {
      const msg = err?.message || 'Invalid attribute value';
      throw new Error(`Invalid value for attribute '${def.slug}': ${msg}`);
    }

    return {
      attributeId: def.id!,
      attributeSlug: def.slug,
      value: parsed,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Category-level rules (required, forbidden, variant required)               */
/* -------------------------------------------------------------------------- */
export function enforceCategoryRules(
  categorySlug: string,
  productAttrs: Array<{ attributeSlug: string }>,
  variantAttrsList: Array<Array<{ attributeSlug: string }>>,
) {
  const rule = CATEGORY_RULES[categorySlug];
  if (!rule) return;

  /* ------------------------------ Required: Product ----------------------------- */
  if (rule.requiredAttributes) {
    for (const req of rule.requiredAttributes) {
      const ok = productAttrs.some((a) => a.attributeSlug === req);
      if (!ok) throw new Error(`Missing required product attribute: ${req}`);
    }
  }

  /* ------------------------------ Required: Variant ------------------------------ */
  if (rule.variantRequiredAttributes) {
    for (const variantAttrs of variantAttrsList) {
      for (const req of rule.variantRequiredAttributes) {
        const ok = variantAttrs.some((a) => a.attributeSlug === req);
        if (!ok) throw new Error(`Missing required variant attribute: ${req}`);
      }
    }
  }

  /* --------------------------------- Forbidden ---------------------------------- */
  if (rule.forbiddenAttributes) {
    for (const forbidden of rule.forbiddenAttributes) {
      if (productAttrs.some((a) => a.attributeSlug === forbidden)) {
        throw new Error(
          `Attribute ${forbidden} is forbidden for category ${categorySlug}`,
        );
      }

      for (const variantAttrs of variantAttrsList) {
        if (variantAttrs.some((a) => a.attributeSlug === forbidden)) {
          throw new Error(
            `Attribute ${forbidden} is forbidden for category ${categorySlug}`,
          );
        }
      }
    }
  }

  // additional rule checks (like sizeType/ageGroup) handled earlier in DTO stage
}
