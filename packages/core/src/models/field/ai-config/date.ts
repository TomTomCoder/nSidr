import { z } from 'zod';
import { IdPrefix } from '../../../utils';
import { commonFieldAIConfig, FieldAIActionType } from './text';

// === OUTPUT SCHEMA (per D-16-01) ===
// Accepts ISO-8601 string (with offset) OR epoch-ms integer.
export const dateFieldOutputSchema = z.union([
  z.string().datetime({ offset: true }),
  z.number().int().nonnegative(),
]);
export type IDateFieldOutput = z.infer<typeof dateFieldOutputSchema>;
// === END OUTPUT SCHEMA ===

export const dateFieldExtractionAIConfigSchema = commonFieldAIConfig.extend({
  type: z.literal(FieldAIActionType.Extraction),
  sourceFieldId: z.string().startsWith(IdPrefix.Field),
});

export type IDateFieldExtractionAIConfig = z.infer<typeof dateFieldExtractionAIConfigSchema>;

export const dateFieldCustomizeAIConfigSchema = commonFieldAIConfig.extend({
  type: z.literal(FieldAIActionType.Customization),
  prompt: z.string(),
});

export type IDateFieldCustomizeAIConfig = z.infer<typeof dateFieldCustomizeAIConfigSchema>;

export const dateFieldAIConfigSchema = z.discriminatedUnion('type', [
  dateFieldExtractionAIConfigSchema,
  dateFieldCustomizeAIConfigSchema,
]);

export type IDateFieldAIConfig = z.infer<typeof dateFieldAIConfigSchema>;
