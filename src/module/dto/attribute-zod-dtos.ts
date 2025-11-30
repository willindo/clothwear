// src/modules/products/dto/attribute-zod-dtos.ts
// ===============================================
// FINAL REFACTORED — fully aligned with:
// - common/zod/attributes/attribute.definition.zod.ts
// - common/zod/attributes/attribute.types.ts
// - attribute.factory.ts (value validation engine)

import { z } from 'zod';
import { NonEmptyString, SlugSchema } from '../../common/zod';
import { attributeKinds } from '../../common/zod/attributes/attribute.types';

//
// Kind Enum (runtime literals required for DTO)
//
export const AttributeKind = z.enum(attributeKinds);
export type AttributeKind = z.infer<typeof AttributeKind>;

//
// Kind-specific option schemas — MUST mirror definition.zod.ts
//
const EnumOptionsZ = z.object({
  choices: z.array(z.string().min(1)).min(1),
  allowCustom: z.boolean().optional(),
});

const MultiselectOptionsZ = z.object({
  choices: z.array(z.string().min(1)).min(1),
  maxSelected: z.number().int().positive().optional(),
  allowCustom: z.boolean().optional(),
});

const RangeOptionsZ = z.object({
  min: z.number(),
  max: z.number(),
  step: z.number().positive().optional(),
});

const SizeOptionsZ = z.object({
  type: z.enum(['ALPHA', 'NUMERIC', 'SHOES', 'FREE']).optional(),
  sizes: z.array(z.string().min(1)).optional(),
});

const ColorOptionsZ = z.object({
  palette: z.array(z.string()).optional(),
  colorFormat: z.enum(['hex', 'name']).optional(),
});

//
// =====================================================
// Base Attribute DTO (returned to API consumers)
// =====================================================
export const AttributeZ = z.object({
  id: z.string().uuid().optional(),
  slug: SlugSchema,
  name: NonEmptyString,
  kind: AttributeKind,
  description: z.string().max(1000).optional(),
  options: z.any().optional(),
  required: z.boolean().optional().default(false),
  searchable: z.boolean().optional().default(true),
  filterable: z.boolean().optional().default(true),
});
export type Attribute = z.infer<typeof AttributeZ>;

//
// =====================================================
// CREATE ATTRIBUTE DTO — mirrors AttributeDefinitionSchema
// =====================================================
export const CreateAttributeZ = z
  .object({
    slug: SlugSchema,
    name: NonEmptyString,
    kind: AttributeKind,
    description: z.string().max(1000).optional(),
    required: z.boolean().optional().default(false),
    searchable: z.boolean().optional().default(true),
    filterable: z.boolean().optional().default(true),
    options: z.any().optional(),
  })
  .superRefine((val, ctx) => {
    // Match the validation logic of attribute.definition.zod.ts
    try {
      switch (val.kind) {
        case 'enum':
          EnumOptionsZ.parse(val.options ?? {});
          break;

        case 'multiselect':
          MultiselectOptionsZ.parse(val.options ?? {});
          break;

        case 'range':
          RangeOptionsZ.parse(val.options ?? {});
          // extra safety: min <= max
          if (
            typeof val.options?.min === 'number' &&
            typeof val.options?.max === 'number' &&
            val.options.min > val.options.max
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['options'],
              message: 'options.min cannot exceed options.max',
            });
          }
          break;

        case 'size':
          SizeOptionsZ.parse(val.options ?? {});
          if (!val.options?.sizes && !val.options?.type) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['options'],
              message:
                'Size kind requires either options.type or options.sizes[]',
            });
          }
          break;

        case 'color':
          ColorOptionsZ.parse(val.options ?? {});
          break;

        case 'string':
        case 'number':
        case 'boolean':
          // no special option validation
          break;

        default:
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unsupported attribute kind: ${String(val.kind)}`,
          });
      }
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: (err as Error).message,
      });
    }
  });

export type CreateAttributeDto = z.infer<typeof CreateAttributeZ>;

//
// =====================================================
// UPDATE ATTRIBUTE DTO (partial)
// =====================================================
export const UpdateAttributeZ = CreateAttributeZ.partial();
export type UpdateAttributeDto = z.infer<typeof UpdateAttributeZ>;

//
// =====================================================
// Attribute Value Validation (lightweight wrapper)
// =====================================================
// NOTE:
// Full validation is performed by common/zod/attributes/attribute.factory.ts
// This wrapper normalizes and calls shared factory logic.
//
export function validateAttributeValue(
  def: { slug: string; kind: AttributeKind; options?: any },
  raw: unknown,
) {
  // Light wrapper: share same canonical validator
  const {
    validateAttributeValue: sharedValidate,
  } = require('../../common/zod/attributes/attribute.factory');

  try {
    const result = sharedValidate(def, raw);
    return { success: true, value: result };
  } catch (e) {
    return { success: false, error: e };
  }
}

//
// =====================================================
// Normalizer — canonicalizes DTO input
// =====================================================
export function normalizeAttributeInput(
  input: CreateAttributeDto,
): CreateAttributeDto {
  const slug = input.slug.trim().toLowerCase().replace(/\s+/g, '-');
  const name = input.name.trim();

  let options = input.options;

  // Deduplicate choices[] for enum / multiselect
  if (options?.choices) {
    options = {
      ...options,
      choices: Array.from(new Set(options.choices.map(String))),
    };
  }

  return { ...input, slug, name, options };
}
//
// =====================================================
// Attribute Value Input Schema (used by product + variant)
// =====================================================
// Example:
// { attributeId?: string; attributeSlug?: string; value: any }
//
export const AttributeValueInputSchema = z
  .object({
    attributeId: z.string().uuid().optional(),
    attributeSlug: z.string().min(1).optional(),
    value: z.any(), // required by validator
  })
  .refine(
    (obj) => obj.attributeId || obj.attributeSlug,
    'Either attributeId or attributeSlug is required',
  )
  .refine(
    (obj) => !(obj.attributeId && obj.attributeSlug),
    'Provide either attributeId OR attributeSlug, not both',
  );

export type AttributeValueInput = z.infer<typeof AttributeValueInputSchema>;
