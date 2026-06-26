import { z } from '../../../zod';
export declare const checkboxFieldOptionsSchema: z.ZodObject<{
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strict>;
export type ICheckboxFieldOptions = z.infer<typeof checkboxFieldOptionsSchema>;
