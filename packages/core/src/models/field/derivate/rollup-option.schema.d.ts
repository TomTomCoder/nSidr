import { z } from '../../../zod';
import { CellValueType } from '../constant';
export declare const ROLLUP_FUNCTIONS: readonly ["countall({values})", "counta({values})", "count({values})", "sum({values})", "average({values})", "max({values})", "min({values})", "and({values})", "or({values})", "xor({values})", "array_join({values})", "array_unique({values})", "array_compact({values})", "concatenate({values})"];
export type RollupFunction = (typeof ROLLUP_FUNCTIONS)[number];
export declare const getRollupFunctionsByCellValueType: (cellValueType: CellValueType) => RollupFunction[];
export declare const isRollupFunctionSupportedForCellValueType: (expression: RollupFunction, cellValueType: CellValueType) => boolean;
export declare const rollupFieldOptionsSchema: z.ZodObject<{
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
        type: z.ZodEnum<typeof import("../show-as").SingleLineTextDisplayType>;
    }, z.core.$strict>, z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodEnum<typeof import("../show-as").SingleNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
        showValue: z.ZodBoolean;
        maxValue: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        type: z.ZodEnum<typeof import("../show-as").MultiNumberDisplayType>;
        color: z.ZodEnum<typeof import("@teable/core").Colors>;
    }, z.core.$strict>]>]>>;
}, z.core.$strip>;
export type IRollupFieldOptions = z.infer<typeof rollupFieldOptionsSchema>;
