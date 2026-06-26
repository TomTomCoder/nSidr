import { z } from 'zod';
import { IdPrefix } from '../../../utils';
import { commonFieldAIConfig, FieldAIActionType } from './text';

// === OUTPUT SCHEMA (per D-16-01) ===
// Factory: when choices configured returns z.enum([names]); else degrades to z.string().
export const buildSingleSelectFieldOutputSchema = (choices?: { name: string }[]) => {
  const names = (choices ?? []).map((c) => c.name).filter((n) => typeof n === 'string' && n.length);
  if (names.length === 0) {
    return z.string();
  }
  return z.enum(names as [string, ...string[]]);
};
export type ISingleSelectFieldOutput = string;
// === END OUTPUT SCHEMA ===

export const singleSelectFieldClassifyAIConfigSchema = commonFieldAIConfig.extend({
  type: z.literal(FieldAIActionType.Classification),
  sourceFieldId: z.string().startsWith(IdPrefix.Field),
});

export type ISingleSelectFieldClassifyAIConfig = z.infer<
  typeof singleSelectFieldClassifyAIConfigSchema
>;

export const singleSelectFieldCustomizeAIConfigSchema = commonFieldAIConfig.extend({
  type: z.literal(FieldAIActionType.Customization),
  prompt: z.string(),
  onlyAllowConfiguredOptions: z.boolean().optional(),
});

export type ISingleSelectFieldCustomizeAIConfig = z.infer<
  typeof singleSelectFieldCustomizeAIConfigSchema
>;

export const singleSelectFieldAIConfigSchema = z.discriminatedUnion('type', [
  singleSelectFieldClassifyAIConfigSchema,
  singleSelectFieldCustomizeAIConfigSchema,
]);

export type ISingleSelectFieldAIConfig = z.infer<typeof singleSelectFieldAIConfigSchema>;
