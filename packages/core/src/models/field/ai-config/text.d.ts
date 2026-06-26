import { z } from 'zod';
export declare const textFieldOutputSchema: z.ZodString;
export type ITextFieldOutput = z.infer<typeof textFieldOutputSchema>;
export declare enum FieldAIActionType {
    Summary = "summary",
    Translation = "translation",
    Improvement = "improvement",
    Extraction = "extraction",
    Classification = "classification",
    Tag = "tag",
    Customization = "customization",
    ImageGeneration = "imageGeneration",
    ImageCustomization = "imageCustomization",
    Rating = "rating"
}
export declare const commonFieldAIConfig: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ICommonFieldAIConfig = z.infer<typeof commonFieldAIConfig>;
export declare const textFieldExtractInfoAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Extraction>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>;
export type ITextFieldExtractInfoAIConfig = z.infer<typeof textFieldExtractInfoAIConfigSchema>;
export declare const textFieldSummarizeAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Summary>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>;
export type ITextFieldSummarizeAIConfig = z.infer<typeof textFieldSummarizeAIConfigSchema>;
export declare const textFieldTranslateAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Translation>;
    sourceFieldId: z.ZodString;
    targetLanguage: z.ZodString;
}, z.core.$strip>;
export type ITextFieldTranslateAIConfig = z.infer<typeof textFieldTranslateAIConfigSchema>;
export declare const textFieldImproveTextAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Improvement>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>;
export type ITextFieldImproveTextAIConfig = z.infer<typeof textFieldImproveTextAIConfigSchema>;
export declare const textFieldCustomizeAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>;
export type ITextFieldCustomizeAIConfig = z.infer<typeof textFieldCustomizeAIConfigSchema>;
export declare const textFieldAIConfigSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Extraction>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Summary>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Translation>;
    sourceFieldId: z.ZodString;
    targetLanguage: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Improvement>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Customization>;
    prompt: z.ZodString;
}, z.core.$strip>], "type">;
export type ITextFieldAIConfig = z.infer<typeof textFieldAIConfigSchema>;
