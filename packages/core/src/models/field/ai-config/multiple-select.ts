import { z } from 'zod';
import { IdPrefix } from '../../../utils';
import { commonFieldAIConfig, FieldAIActionType } from './text';

// === OUTPUT SCHEMA (per D-16-01) ===
// Factory: array of choice names; empty array valid; degrades to z.array(z.string()) without choices.
export const buildMultipleSelectFieldOutputSchema = (choices?: { name: string }[]) => {
  const names = (choices ?? []).map((c) => c.name).filter((n) => typeof n === 'string' && n.length);
  if (names.length === 0) {
    return z.array(z.string()).min(0);
  }
  return z.array(z.enum(names as [string, ...string[]])).min(0);
};
export type IMultipleSelectFieldOutput = string[];
// === END OUTPUT SCHEMA ===

export const multipleSelectFieldTagAIConfigSchema = commonFieldAIConfig.extend({
  type: z.literal(FieldAIActionType.Tag),
  sourceFieldId: z.string().startsWith(IdPrefix.Field),
});

export type IMultipleSelectFieldTagAIConfig = z.infer<typeof multipleSelectFieldTagAIConfigSchema>;

export const multipleSelectFieldCustomizeAIConfigSchema = commonFieldAIConfig.extend({
  type: z.literal(FieldAIActionType.Customization),
  prompt: z.string(),
  onlyAllowConfiguredOptions: z.boolean().optional(),
});

export type IMultipleSelectFieldCustomizeAIConfig = z.infer<
  typeof multipleSelectFieldCustomizeAIConfigSchema
>;

export const multipleSelectFieldAIConfigSchema = z.discriminatedUnion('type', [
  multipleSelectFieldTagAIConfigSchema,
  multipleSelectFieldCustomizeAIConfigSchema,
]);

export type IMultipleSelectFieldAIConfig = z.infer<typeof multipleSelectFieldAIConfigSchema>;
