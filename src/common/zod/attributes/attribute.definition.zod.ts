// attribute.definition.zod.ts
// ==========================
import { z } from 'zod';
import { NonEmptyString, SlugSchema } from '../index';
import { attributeKinds } from './attribute.types';
import { SizeTypeEnum } from 'src/schemas/shared/syze-type.zod';

// Option Schemas
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
  type: SizeTypeEnum.optional(),
  sizes: z.array(z.string().min(1)).optional(),
});

const ColorOptionsZ = z.object({
  palette: z.array(z.string()).optional(),
  colorFormat: z.enum(['hex', 'name']).optional(),
});

//
// Attribute Definition Schema
//
export const AttributeDefinitionSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: SlugSchema,
    name: NonEmptyString,
    kind: z.enum(attributeKinds),
    description: z.string().max(1000).optional(),
    options: z.any().optional(), // validated in superRefine
    pattern: z.string().optional(),
    required: z.boolean().optional().default(false),
    searchable: z.boolean().optional().default(true),
    filterable: z.boolean().optional().default(true),
    createdAt: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    //
    // Validate options by kind
    //
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
          break;

        case 'size':
          SizeOptionsZ.parse(val.options ?? {});
          break;

        case 'color':
          ColorOptionsZ.parse(val.options ?? {});
          break;
      }
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: (err as Error).message,
      });
    }

    //
    // Pattern validation
    //
    if (val.pattern) {
      try {
        new RegExp(val.pattern);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pattern'],
          message: 'Invalid regex pattern',
        });
      }
    }

    //
    // Range: must have min & max
    //
    if (val.kind === 'range') {
      const opts = val.options;
      if (!opts?.min || !opts?.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: 'Range attributes must declare min and max (inside options)',
        });
      }
    }

    //
    // Size: must have sizes[] or type
    //
    if (val.kind === 'size') {
      const opts = val.options;
      if (!opts?.sizes && !opts?.type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message:
            'Size kind requires either type (ALPHA/NUMERIC/SHOES/FREE) or explicit sizes[] list',
        });
      }
    }
  });

export type AttributeDefinition = z.infer<typeof AttributeDefinitionSchema>;
