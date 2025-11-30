// attribute.types.ts
// ==========================
import { SizeTypeEnum } from 'src/schemas/shared/syze-type.zod';

export const attributeKinds = [
  'string',
  'number',
  'boolean',
  'enum',
  'multiselect',
  'color',
  'range',
  'size',
] as const;

export type AttributeKind = (typeof attributeKinds)[number];

export type SizeType = 'ALPHA' | 'NUMERIC' | 'SHOES' | 'FREE';

export type EnumOptions = {
  choices: string[];
  allowCustom?: boolean;
};

export type MultiselectOptions = {
  choices: string[];
  maxSelected?: number;
  allowCustom?: boolean;
};

export type RangeOptions = {
  min: number;
  max: number;
  step?: number;
};

export type SizeOptions = {
  type?: SizeType;
  sizes?: string[];
};

export type ColorOptions = {
  palette?: string[];
  colorFormat?: 'hex' | 'name';
};

export type AttributeOptions =
  | EnumOptions
  | MultiselectOptions
  | RangeOptions
  | SizeOptions
  | ColorOptions
  | undefined;
