import { z } from 'zod';
import type { CellValueType, FieldType } from '../constant';
import type { IFieldVisitor } from '../field-visitor.interface';
import type { ILookupOptionsVo } from '../lookup-options-base.schema';
import { FormulaAbstractCore } from './abstract/formula.field.abstract';
import { type IRollupFieldOptions } from './rollup-option.schema';
export declare const rollupCelValueSchema: z.ZodAny;
export type IRollupCellValue = z.infer<typeof rollupCelValueSchema>;
export declare class RollupFieldCore extends FormulaAbstractCore {
    static defaultOptions(cellValueType: CellValueType): IRollupFieldOptions;
    static getParsedValueType(expression: string, cellValueType: CellValueType, isMultipleCellValue: boolean): {
        cellValueType: CellValueType;
        isMultipleCellValue: boolean | undefined;
    };
    type: FieldType.Rollup;
    options: IRollupFieldOptions;
    meta?: undefined;
    lookupOptions: ILookupOptionsVo;
    validateOptions(): z.ZodSafeParseResult<{
        expression: "countall({values})" | "counta({values})" | "count({values})" | "sum({values})" | "average({values})" | "max({values})" | "min({values})" | "and({values})" | "or({values})" | "xor({values})" | "array_join({values})" | "array_unique({values})" | "array_compact({values})" | "concatenate({values})";
        formatting: {
            precision: number;
            type: import("../formatting").NumberFormattingType.Decimal;
        } | {
            precision: number;
            type: import("../formatting").NumberFormattingType.Percent;
        } | {
            precision: number;
            type: import("../formatting").NumberFormattingType.Currency;
            symbol: string;
        } | {
            date: string;
            time: import("../formatting").TimeFormatting;
            timeZone: string;
        } | undefined;
        showAs: {
            type: import("../show-as").SingleLineTextDisplayType;
        } | {
            type: import("../show-as").SingleNumberDisplayType;
            color: import("@teable/core").Colors;
            showValue: boolean;
            maxValue: number;
        } | {
            type: import("../show-as").MultiNumberDisplayType;
            color: import("@teable/core").Colors;
        } | {
            type: "markdown";
        } | undefined;
    }>;
    /**
     * Override to return the foreign table ID for rollup fields
     */
    getForeignTableId(): string | undefined;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
