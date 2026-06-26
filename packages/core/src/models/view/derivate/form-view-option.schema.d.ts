import { z } from '../../../zod';
export declare const formViewOptionSchema: z.ZodObject<{
    coverUrl: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodOptional<z.ZodString>;
    submitLabel: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type IFormViewOptions = z.infer<typeof formViewOptionSchema>;
