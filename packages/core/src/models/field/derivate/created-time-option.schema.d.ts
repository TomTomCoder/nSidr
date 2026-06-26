import { z } from '../../../zod';
export declare const createdTimeFieldOptionsSchema: z.ZodObject<{
    expression: z.ZodLiteral<"CREATED_TIME()">;
    formatting: z.ZodObject<{
        date: z.ZodString;
        time: z.ZodEnum<typeof import("../formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ICreatedTimeFieldOptions = z.infer<typeof createdTimeFieldOptionsSchema>;
export declare const createdTimeFieldOptionsRoSchema: z.ZodObject<{
    formatting: z.ZodObject<{
        date: z.ZodString;
        time: z.ZodEnum<typeof import("../formatting").TimeFormatting>;
        timeZone: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ICreatedTimeFieldOptionsRo = z.infer<typeof createdTimeFieldOptionsRoSchema>;
