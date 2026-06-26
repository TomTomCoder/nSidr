import { z } from 'zod';
import { IdPrefix } from '../../../utils';
import { commonFieldAIConfig, FieldAIActionType } from './text';

// === OUTPUT SCHEMA (per D-16-01) ===
// Factory: int in [1, max]. Default max=5 (matches rating field default).
export const buildRatingFieldOutputSchema = (max: number = 5) => {
  return z.number().int().min(1).max(max);
};
export type IRatingFieldOutput = number;
// === END OUTPUT SCHEMA ===

export const ratingFieldRatingAIConfigSchema = commonFieldAIConfig.extend({
  type: z.literal(FieldAIActionType.Rating),
  sourceFieldId: z.string().startsWith(IdPrefix.Field),
});

export type IRatingFieldRatingAIConfig = z.infer<typeof ratingFieldRatingAIConfigSchema>;

export const ratingFieldCustomizeAIConfigSchema = commonFieldAIConfig.extend({
  type: z.literal(FieldAIActionType.Customization),
  prompt: z.string(),
});

export type IRatingFieldCustomizeAIConfig = z.infer<typeof ratingFieldCustomizeAIConfigSchema>;

export const ratingFieldAIConfigSchema = z.discriminatedUnion('type', [
  ratingFieldRatingAIConfigSchema,
  ratingFieldCustomizeAIConfigSchema,
]);

export type IRatingFieldAIConfig = z.infer<typeof ratingFieldAIConfigSchema>;
