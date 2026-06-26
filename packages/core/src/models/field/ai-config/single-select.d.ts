import { z } from 'zod';
import { FieldAIActionType } from './text';
export declare const buildSingleSelectFieldOutputSchema: (choices?: {
    name: string;
}[]) => z.ZodString | z.ZodEnum<{
    [x: string]: string;
}>;
export type ISingleSelectFieldOutput = string;
export declare const singleSelectFieldClassifyAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Classification>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>;
export type ISingleSelectFieldClassifyAIConfig = z.infer<typeof singleSelectFieldClassifyAIConfigSchema>;
export declare const singleSelectFieldCustomizeAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Customization>;
    prompt: z.ZodString;
    onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type ISingleSelectFieldCustomizeAIConfig = z.infer<typeof singleSelectFieldCustomizeAIConfigSchema>;
export declare const singleSelectFieldAIConfigSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Classification>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Customization>;
    prompt: z.ZodString;
    onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>], "type">;
export type ISingleSelectFieldAIConfig = z.infer<typeof singleSelectFieldAIConfigSchema>;
