import type { IFilter } from '../../view/filter';
import type { CellValueType, FieldType } from '../constant';
import type { IFieldVisitor } from '../field-visitor.interface';
import { FormulaAbstractCore } from './abstract/formula.field.abstract';
import { type IConditionalRollupFieldOptions } from './conditional-rollup-option.schema';
export declare class ConditionalRollupFieldCore extends FormulaAbstractCore {
    static defaultOptions(cellValueType: CellValueType): Partial<IConditionalRollupFieldOptions>;
    static getParsedValueType(expression: string, cellValueType: CellValueType, isMultipleCellValue: boolean): {
        cellValueType: CellValueType;
        isMultipleCellValue: boolean | undefined;
    };
    type: FieldType.ConditionalRollup;
    options: IConditionalRollupFieldOptions;
    meta?: undefined;
    getFilter(): IFilter | undefined;
    static supportsOrdering(expression?: string): boolean;
    validateOptions(): import("zod").ZodSafeParseResult<{
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
        timeZone?: string | undefined;
        baseId?: string | undefined;
        foreignTableId?: string | undefined;
        lookupFieldId?: string | undefined;
        filter?: import("../../view/filter").IFilterSet | null | undefined;
        sort?: {
            fieldId: string;
            order: import("@teable/core").SortFunc;
        } | undefined;
        limit?: number | undefined;
    }>;
    getForeignTableId(): string | undefined;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
