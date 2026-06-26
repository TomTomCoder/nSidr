import { z } from '../../../zod';
export declare const autoNumberFieldOptionsSchema: z.ZodObject<{
    expression: z.ZodLiteral<"AUTO_NUMBER()">;
}, z.core.$strip>;
export type IAutoNumberFieldOptions = z.infer<typeof autoNumberFieldOptionsSchema>;
export declare const autoNumberFieldOptionsRoSchema: z.ZodObject<{}, z.core.$strip>;
export type IAutoNumberFieldOptionsRo = z.infer<typeof autoNumberFieldOptionsRoSchema>;
