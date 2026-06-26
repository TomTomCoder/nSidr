import { z } from '../../../zod';
export declare const lastModifiedTimeFieldOptionsSchema: z.ZodObject<{
    expression: z.ZodDefault<z.ZodLiteral<"LAST_MODIFIED_TIME()">>;
    formatting: z.ZodOptional<z.ZodObject<{
        date: z.ZodString;
        time: z.ZodEnum<typeof import("../formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>>;
    trackedFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$loose>;
export type ILastModifiedTimeFieldOptions = z.infer<typeof lastModifiedTimeFieldOptionsSchema>;
export declare const lastModifiedTimeFieldOptionsRoSchema: z.ZodObject<{
    expression: z.ZodDefault<z.ZodLiteral<"LAST_MODIFIED_TIME()">>;
    formatting: z.ZodOptional<z.ZodObject<{
        date: z.ZodString;
        time: z.ZodEnum<typeof import("../formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>>;
    trackedFieldIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$loose>;
export type ILastModifiedTimeFieldOptionsRo = z.infer<typeof lastModifiedTimeFieldOptionsRoSchema>;
