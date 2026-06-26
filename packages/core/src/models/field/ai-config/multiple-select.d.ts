import { z } from 'zod';
import { FieldAIActionType } from './text';
export declare const buildMultipleSelectFieldOutputSchema: (choices?: {
    name: string;
}[]) => z.ZodArray<z.ZodString> | z.ZodArray<z.ZodEnum<{
    [x: string]: string;
}>>;
export type IMultipleSelectFieldOutput = string[];
export declare const multipleSelectFieldTagAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Tag>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>;
export type IMultipleSelectFieldTagAIConfig = z.infer<typeof multipleSelectFieldTagAIConfigSchema>;
export declare const multipleSelectFieldCustomizeAIConfigSchema: z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Customization>;
    prompt: z.ZodString;
    onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type IMultipleSelectFieldCustomizeAIConfig = z.infer<typeof multipleSelectFieldCustomizeAIConfigSchema>;
export declare const multipleSelectFieldAIConfigSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Tag>;
    sourceFieldId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    modelKey: z.ZodString;
    isAutoFill: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    attachPrompt: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<FieldAIActionType.Customization>;
    prompt: z.ZodString;
    onlyAllowConfiguredOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>], "type">;
export type IMultipleSelectFieldAIConfig = z.infer<typeof multipleSelectFieldAIConfigSchema>;
