import { z } from 'zod';
import { Colors } from '../colors';
export declare const buttonFieldOptionsSchema: z.ZodObject<{
    label: z.ZodString;
    color: z.ZodEnum<typeof Colors>;
    maxCount: z.ZodOptional<z.ZodNumber>;
    resetCount: z.ZodOptional<z.ZodBoolean>;
    workflow: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
        isActive: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>>;
    confirm: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        confirmText: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type IButtonFieldOptions = z.infer<typeof buttonFieldOptionsSchema>;
