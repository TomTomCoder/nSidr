import { z } from '../../../zod';
import { SortFunc } from './sort-func.enum';
export declare const orderSchema: z.ZodEnum<typeof SortFunc>;
export declare const sortItemSchema: z.ZodObject<{
    fieldId: z.ZodString;
    order: z.ZodEnum<typeof SortFunc>;
}, z.core.$strip>;
export declare const sortSchema: z.ZodNullable<z.ZodObject<{
    sortObjs: z.ZodArray<z.ZodObject<{
        fieldId: z.ZodString;
        order: z.ZodEnum<typeof SortFunc>;
    }, z.core.$strip>>;
    manualSort: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>>;
export declare const sortStringSchema: z.ZodPipe<z.ZodString, z.ZodTransform<{
    sortObjs: {
        fieldId: string;
        order: SortFunc;
    }[];
    manualSort?: boolean | undefined;
} | null, string>>;
export type ISortItem = z.infer<typeof sortItemSchema>;
export type ISort = z.infer<typeof sortSchema>;
export declare const manualSortRoSchema: z.ZodObject<{
    sortObjs: z.ZodArray<z.ZodObject<{
        fieldId: z.ZodString;
        order: z.ZodEnum<typeof SortFunc>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type IManualSortRo = z.infer<typeof manualSortRoSchema>;
export declare function mergeWithDefaultSort(defaultViewSort?: string | null, querySort?: ISortItem[]): ISortItem[];
