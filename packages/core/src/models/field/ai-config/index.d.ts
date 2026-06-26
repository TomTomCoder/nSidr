import { z } from 'zod';
import { FieldType } from '../constant';
export * from './text';
export * from './single-select';
export * from './multiple-select';
export * from './attachment';
export * from './rating';
export * from './date';
export declare const fieldAIConfigSchema: z.ZodUnion<readonly [z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Extraction>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Summary>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Translation>;
    sourceFieldId: z.ZodString;
    targetLanguage: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Improvement>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Classification>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Customization>;
    prompt: z.ZodString;
    onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Tag>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Customization>;
    prompt: z.ZodString;
    onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    n: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodEnum<typeof import("./attachment").ImageQuality>>;
    aspectRatio: z.ZodOptional<z.ZodString>;
    resolution: z.ZodOptional<z.ZodEnum<{
        "1K": "1K";
        "2K": "2K";
        "4K": "4K";
    }>>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.ImageGeneration>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    n: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodEnum<typeof import("./attachment").ImageQuality>>;
    aspectRatio: z.ZodOptional<z.ZodString>;
    resolution: z.ZodOptional<z.ZodEnum<{
        "1K": "1K";
        "2K": "2K";
        "4K": "4K";
    }>>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.ImageCustomization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Rating>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type">, z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Extraction>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type">]>;
export type IFieldAIConfig = z.infer<typeof fieldAIConfigSchema>;
export declare const getAiConfigSchema: (type: FieldType) => z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Extraction>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Summary>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Translation>;
    sourceFieldId: z.ZodString;
    targetLanguage: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Improvement>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type"> | z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Classification>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Customization>;
    prompt: z.ZodString;
    onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>], "type"> | z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Tag>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Customization>;
    prompt: z.ZodString;
    onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>], "type"> | z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    n: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodEnum<typeof import("./attachment").ImageQuality>>;
    aspectRatio: z.ZodOptional<z.ZodString>;
    resolution: z.ZodOptional<z.ZodEnum<{
        "1K": "1K";
        "2K": "2K";
        "4K": "4K";
    }>>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.ImageGeneration>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    n: z.ZodOptional<z.ZodNumber>;
    size: z.ZodOptional<z.ZodString>;
    quality: z.ZodOptional<z.ZodEnum<typeof import("./attachment").ImageQuality>>;
    aspectRatio: z.ZodOptional<z.ZodString>;
    resolution: z.ZodOptional<z.ZodEnum<{
        "1K": "1K";
        "2K": "2K";
        "4K": "4K";
    }>>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.ImageCustomization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type"> | z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Rating>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type"> | z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Extraction>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<import("./text").FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type"> | z.ZodUndefined;
/**
 * getAiOutputSchema (per D-16-01)
 *
 * Returns the Zod schema used to validate the LLM-produced cell value BEFORE
 * the value is written to a typed cell. Distinct from getAiConfigSchema, which
 * validates the user-supplied AI config. Dispatch by FieldType; for parametric
 * types (SingleSelect/MultipleSelect/Rating) the schema is built from the
 * field's options at call time.
 */
export declare const getAiOutputSchema: (field: {
    type: FieldType;
    options?: {
        choices?: {
            name: string;
        }[];
        max?: number;
    } | null;
}) => z.ZodTypeAny;
