import { z } from 'zod';
import { FieldType } from '../constant';
import { attachmentFieldAIConfigSchema, attachmentFieldOutputSchema } from './attachment';
import { dateFieldAIConfigSchema, dateFieldOutputSchema } from './date';
import {
  multipleSelectFieldAIConfigSchema,
  buildMultipleSelectFieldOutputSchema,
} from './multiple-select';
import { ratingFieldAIConfigSchema, buildRatingFieldOutputSchema } from './rating';
import {
  singleSelectFieldAIConfigSchema,
  buildSingleSelectFieldOutputSchema,
} from './single-select';
import { textFieldAIConfigSchema, textFieldOutputSchema } from './text';

export * from './text';
export * from './single-select';
export * from './multiple-select';
export * from './attachment';
export * from './rating';
export * from './date';
export const fieldAIConfigSchema = z.union([
  textFieldAIConfigSchema,
  singleSelectFieldAIConfigSchema,
  multipleSelectFieldAIConfigSchema,
  attachmentFieldAIConfigSchema,
  ratingFieldAIConfigSchema,
  dateFieldAIConfigSchema,
]);

export type IFieldAIConfig = z.infer<typeof fieldAIConfigSchema>;

export const getAiConfigSchema = (type: FieldType) => {
  switch (type) {
    case FieldType.SingleLineText:
    case FieldType.LongText:
      return textFieldAIConfigSchema;
    case FieldType.SingleSelect:
      return singleSelectFieldAIConfigSchema;
    case FieldType.MultipleSelect:
      return multipleSelectFieldAIConfigSchema;
    case FieldType.Attachment:
      return attachmentFieldAIConfigSchema;
    case FieldType.Rating:
    case FieldType.Number:
      return ratingFieldAIConfigSchema;
    case FieldType.Date:
      return dateFieldAIConfigSchema;
    default:
      return z.undefined();
  }
};

/**
 * getAiOutputSchema (per D-16-01)
 *
 * Returns the Zod schema used to validate the LLM-produced cell value BEFORE
 * the value is written to a typed cell. Distinct from getAiConfigSchema, which
 * validates the user-supplied AI config. Dispatch by FieldType; for parametric
 * types (SingleSelect/MultipleSelect/Rating) the schema is built from the
 * field's options at call time.
 */
export const getAiOutputSchema = (field: {
  type: FieldType;
  options?: { choices?: { name: string }[]; max?: number } | null;
}): z.ZodTypeAny => {
  switch (field.type) {
    case FieldType.SingleSelect:
      return buildSingleSelectFieldOutputSchema(field.options?.choices);
    case FieldType.MultipleSelect:
      return buildMultipleSelectFieldOutputSchema(field.options?.choices);
    case FieldType.Rating:
      return buildRatingFieldOutputSchema(field.options?.max ?? 5);
    case FieldType.Date:
      return dateFieldOutputSchema;
    case FieldType.Attachment:
      return attachmentFieldOutputSchema;
    default:
      return textFieldOutputSchema;
  }
};
