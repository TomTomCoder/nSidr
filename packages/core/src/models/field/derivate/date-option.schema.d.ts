import { z } from '../../../zod';
export declare const dateFieldOptionsSchema: z.ZodObject<{
    formatting: z.ZodObject<{
        date: z.ZodString;
        time: z.ZodEnum<typeof import("../formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        now: "now";
    }>>>;
}, z.core.$strip>;
export type IDateFieldOptions = z.infer<typeof dateFieldOptionsSchema>;
