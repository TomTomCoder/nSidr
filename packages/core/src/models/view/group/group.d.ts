import { z } from '../../../zod';
export declare const groupItemSchema: z.ZodObject<{
    fieldId: z.ZodString;
    order: z.ZodEnum<typeof import("../sort").SortFunc>;
}, z.core.$strip>;
export declare const groupSchema: z.ZodNullable<z.ZodArray<z.ZodObject<{
    fieldId: z.ZodString;
    order: z.ZodEnum<typeof import("../sort").SortFunc>;
}, z.core.$strip>>>;
export declare const viewGroupRoSchema: z.ZodObject<{
    group: z.ZodNullable<z.ZodNullable<z.ZodArray<z.ZodObject<{
        fieldId: z.ZodString;
        order: z.ZodEnum<typeof import("../sort").SortFunc>;
    }, z.core.$strip>>>>;
}, z.core.$strip>;
export type IViewGroupRo = z.infer<typeof viewGroupRoSchema>;
export type IGroupItem = z.infer<typeof groupItemSchema>;
export type IGroup = z.infer<typeof groupSchema>;
export declare const groupStringSchema: z.ZodPipe<z.ZodString, z.ZodTransform<{
    fieldId: string;
    order: import("../sort").SortFunc;
}[] | null, string>>;
export declare function parseGroup(queryGroup?: IGroup): IGroup | undefined;
