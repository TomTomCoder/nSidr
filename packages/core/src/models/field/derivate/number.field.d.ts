import { z } from 'zod';
import type { FieldType, CellValueType } from '../constant';
import { FieldCore } from '../field';
import type { IFieldVisitor } from '../field-visitor.interface';
import { type INumberFieldOptions } from './number-option.schema';
export declare const numberCellValueSchema: z.ZodNumber;
export type INumberCellValue = z.infer<typeof numberCellValueSchema>;
export declare class NumberFieldCore extends FieldCore {
    type: FieldType.Number;
    options: INumberFieldOptions;
    meta?: undefined;
    cellValueType: CellValueType.Number;
    static defaultOptions(): INumberFieldOptions;
    cellValue2String(cellValue?: unknown): string;
    item2String(value?: unknown): string;
    convertStringToCellValue(value: string): number | null;
    repair(value: unknown): number | null;
    validateOptions(): z.ZodSafeParseResult<{
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
        };
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
    validateCellValue(value: unknown): z.ZodSafeParseResult<number | null> | z.ZodSafeParseResult<number[] | null>;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
