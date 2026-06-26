import { z } from '../../../zod';
export declare const userFieldOptionsSchema: z.ZodObject<{
    isMultiple: z.ZodOptional<z.ZodBoolean>;
    shouldNotify: z.ZodOptional<z.ZodBoolean>;
    defaultValue: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodUnion<[z.ZodString, z.ZodEnum<{
        me: "me";
    }>]>, z.ZodArray<z.ZodUnion<[z.ZodString, z.ZodEnum<{
        me: "me";
    }>]>>]>>>;
}, z.core.$strip>;
export type IUserFieldOptions = z.infer<typeof userFieldOptionsSchema>;
