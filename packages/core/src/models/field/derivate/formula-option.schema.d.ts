import { z } from '../../../zod';
export declare const formulaFieldOptionsSchema: z.ZodObject<{
    expression: z.ZodString;
    timeZone: z.ZodOptional<z.ZodString>;
    formatting: z.ZodOptional<z.ZodAny>;
    showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("../show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("../show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("../show-as").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>]>>;
}, z.core.$strip>;
export type IFormulaFieldOptions = z.infer<typeof formulaFieldOptionsSchema>;
export declare const formulaFieldMetaSchema: z.ZodObject<{
    persistedAsGeneratedColumn: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type IFormulaFieldMeta = z.infer<typeof formulaFieldMetaSchema>;
