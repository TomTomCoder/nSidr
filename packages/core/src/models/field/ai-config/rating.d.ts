import { z } from 'zod';
import { FieldAIActionType } from './text';
export declare const buildRatingFieldOutputSchema: (max?: number) => z.ZodNumber;
export type IRatingFieldOutput = number;
export declare const ratingFieldRatingAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Rating>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>;
export type IRatingFieldRatingAIConfig = z.infer<typeof ratingFieldRatingAIConfigSchema>;
export declare const ratingFieldCustomizeAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>;
export type IRatingFieldCustomizeAIConfig = z.infer<typeof ratingFieldCustomizeAIConfigSchema>;
export declare const ratingFieldAIConfigSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Rating>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type">;
export type IRatingFieldAIConfig = z.infer<typeof ratingFieldAIConfigSchema>;
