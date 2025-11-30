import {
  Gender,
  Fit,
  AgeGroup,
  MaterialType,
  Condition,
  ProductType,
  Season,
} from '@prisma/client';

import { z } from 'zod';

// native Zod enums for validations
export const GenderEnum = z.nativeEnum(Gender);
export const FitEnum = z.nativeEnum(Fit);
export const AgeGroupEnum = z.nativeEnum(AgeGroup);
export const MaterialTypeEnum = z.nativeEnum(MaterialType);
export const ConditionEnum = z.nativeEnum(Condition);
export const ProductTypeEnum = z.nativeEnum(ProductType);
export const SeasonEnum = z.nativeEnum(Season);
