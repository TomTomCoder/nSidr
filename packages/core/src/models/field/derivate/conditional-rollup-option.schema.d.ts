import { z } from '../../../zod';
import { SortFunc } from '../../view/sort';
export declare const conditionalRollupFieldOptionsSchema: z.ZodObject<{
    expression: z.ZodEnum<{
        "countall({values})": "countall({values})";
        "counta({values})": "counta({values})";
        "count({values})": "count({values})";
        "sum({values})": "sum({values})";
        "average({values})": "average({values})";
        "max({values})": "max({values})";
        "min({values})": "min({values})";
        "and({values})": "and({values})";
        "or({values})": "or({values})";
        "xor({values})": "xor({values})";
        "array_join({values})": "array_join({values})";
        "array_unique({values})": "array_unique({values})";
        "array_compact({values})": "array_compact({values})";
        "concatenate({values})": "concatenate({values})";
    }>;
    timeZone: z.ZodOptional<z.ZodString>;
    formatting: z.ZodOptional<z.ZodAny>;
    showAs: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("@teable/core").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("@teable/core").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("@teable/core").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>]>>;
    baseId: z.ZodOptional<z.ZodString>;
    foreignTableId: z.ZodOptional<z.ZodString>;
    lookupFieldId: z.ZodOptional<z.ZodString>;
    filter: z.ZodOptional<z.ZodNullable<z.ZodType<import("../../view/filter").IFilterSet, unknown, z.core.$ZodTypeInternals<import("../../view/filter").IFilterSet, unknown>>>>;
    sort: z.ZodOptional<z.ZodObject<{
        fieldId: z.ZodString;
        order: z.ZodEnum<typeof SortFunc>;
    }, z.core.$strip>>;
    limit: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type IConditionalRollupFieldOptions = z.infer<typeof conditionalRollupFieldOptionsSchema>;
