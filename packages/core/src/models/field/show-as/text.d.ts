import { z } from 'zod';
export declare enum SingleLineTextDisplayType {
    Url = "url",
    Email = "email",
    Phone = "phone"
}
export declare const singleLineTextShowAsSchema: z.ZodObject<{
    type: z.ZodEnum<typeof SingleLineTextDisplayType>;
}, z.core.$strip>;
export type ISingleLineTextShowAs = z.infer<typeof singleLineTextShowAsSchema>;
