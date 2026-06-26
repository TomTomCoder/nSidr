import { z } from '../../../zod';
export declare const longTextShowAsSchema: z.ZodObject<{
    type: z.ZodLiteral<"markdown">;
}, z.core.$strip>;
export type ILongTextShowAs = z.infer<typeof longTextShowAsSchema>;
export declare const longTextFieldOptionsSchema: z.ZodObject<{
    showAs: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"markdown">;
    }, z.core.$strip>>>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<string | undefined, string | undefined>>>>;
}, z.core.$strip>;
export type ILongTextFieldOptions = z.infer<typeof longTextFieldOptionsSchema>;
