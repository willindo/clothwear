// File: src/schemas/attributes/attribute.dynamic.zod.ts
import { z } from 'zod';
import { NonEmptyString } from '../../common/zod';
import { UUIDSchema } from '../shared/id.zod';

/**
 * Dynamic attribute input: either attributeId or attributeSlug must be present.
 * Value is validated at runtime against attribute definition loaded from DB.
 */
export const DynamicAttributeInput = z
  .object({
    attributeSlug: NonEmptyString.optional(),
    attributeId: UUIDSchema.optional(),
    value: z.any(),
  })
  .refine((v) => !!v.attributeId || !!v.attributeSlug, {
    message: 'Either attributeId or attributeSlug must be provided',
  });

export const DynamicAttributeList = z.array(DynamicAttributeInput);

export type DynamicAttributeInputType = z.infer<typeof DynamicAttributeInput>;
