import { z } from '../../../../zod';
export declare const selectFieldChoiceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
}, z.core.$strip>;
export declare const selectFieldChoiceRoSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ISelectFieldChoice = z.infer<typeof selectFieldChoiceSchema>;
export declare const selectFieldOptionsSchema: z.ZodObject<{
    choices: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
    }, z.core.$strip>>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>>;
    preventAutoNewOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const selectFieldOptionsRoSchema: z.ZodObject<{
    choices: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>>>;
    preventAutoNewOptions: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type ISelectFieldOptions = z.infer<typeof selectFieldOptionsSchema>;
export type ISelectFieldOptionsRo = z.infer<typeof selectFieldOptionsRoSchema>;
