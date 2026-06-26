import { z } from 'zod';
import { FieldAIActionType } from './text';
export declare const dateFieldOutputSchema: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
export type IDateFieldOutput = z.infer<typeof dateFieldOutputSchema>;
export declare const dateFieldExtractionAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Extraction>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>;
export type IDateFieldExtractionAIConfig = z.infer<typeof dateFieldExtractionAIConfigSchema>;
export declare const dateFieldCustomizeAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>;
export type IDateFieldCustomizeAIConfig = z.infer<typeof dateFieldCustomizeAIConfigSchema>;
export declare const dateFieldAIConfigSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Extraction>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type">;
export type IDateFieldAIConfig = z.infer<typeof dateFieldAIConfigSchema>;
