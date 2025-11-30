// attribute.factory.ts
// ==========================
import { AttributeDefinition } from './attribute.definition.zod';
import { z } from 'zod';
import { SizeType } from 'src/schemas/shared/syze-type.zod';
//
// Size Validation Helpers
//
const sizeTypeSchemas = {
  ALPHA: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
  NUMERIC: z.number().int(),
  SHOES: z.number().int().min(4).max(15),
  FREE: z.literal('FREE'),
} as const;
export function validateSize(def: AttributeDefinition, value: any) {
  const type = def.options?.type as SizeType | undefined;
  const explicitSizes = def.options?.sizes;

  // explicit sizes take full priority
  if (explicitSizes?.length) {
    const parsed = z.string().nonempty().safeParse(value);
    if (!parsed.success) throw parsed.error;
    if (!explicitSizes.includes(parsed.data)) {
      throw new Error(
        `Invalid size '${parsed.data}'. Allowed: ${explicitSizes.join(', ')}`,
      );
    }
    return parsed.data;
  }

  if (!type) {
    throw new Error("Size attribute missing 'type' and no explicit sizes[]");
  }

  const schema = sizeTypeSchemas[type];
  return schema.parse(value);
}

//
// Create Zod schema for attribute values
//
export const createAttributeValueSchema = (def: AttributeDefinition) => {
  switch (def.kind) {
    case 'string': {
      const base = z.string().trim();
      return def.pattern ? base.regex(new RegExp(def.pattern)) : base;
    }

    case 'number':
      return z.number();

    case 'boolean':
      return z.boolean();

    case 'enum': {
      const choices = def.options?.choices;
      return choices?.length
        ? z.enum([...choices] as [string, ...string[]])
        : z.string();
    }

    case 'multiselect': {
      const choices = def.options?.choices;
      const allowCustom = def.options?.allowCustom;

      return z
        .array(z.string().min(1))
        .min(1)
        .refine(
          (vals) => {
            if (allowCustom || !choices) return true;
            const set = new Set(choices);
            return vals.every((v) => set.has(v));
          },
          { message: 'Invalid multiselect value' },
        );
    }

    case 'color': {
      const palette = def.options?.palette;
      const format = def.options?.colorFormat;

      if (format === 'hex')
        return z.string().regex(/^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/);

      if (palette?.length)
        return z.string().refine((v) => palette.includes(v), {
          message: 'Color not in palette',
        });

      return z.string();
    }

    case 'range': {
      const min = def.options?.min;
      const max = def.options?.max;

      return z
        .number()
        .refine(
          (v) => min !== undefined && max !== undefined && v >= min && v <= max,
          { message: `Value must be between ${min} and ${max}` },
        );
    }

    case 'size':
      return z.any().superRefine((val, ctx) => {
        try {
          validateSize(def, val);
        } catch (e) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: (e as Error).message,
          });
        }
      });

    default:
      return z.any();
  }
};

export function validateAttributeValue(def: AttributeDefinition, raw: any) {
  return createAttributeValueSchema(def).parse(raw);
}
