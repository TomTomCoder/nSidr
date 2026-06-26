import { z } from '../../../zod';
export declare const singlelineTextFieldOptionsSchema: z.ZodObject<{
    showAs: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<typeof import("../show-as").SingleLineTextDisplayType>;
    }, z.core.$strip>>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>>;
}, z.core.$strip>;
export type ISingleLineTextFieldOptions = z.infer<typeof singlelineTextFieldOptionsSchema>;
