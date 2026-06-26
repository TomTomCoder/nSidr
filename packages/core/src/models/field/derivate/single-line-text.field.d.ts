import { z } from 'zod';
import type { FieldType, CellValueType } from '../constant';
import { FieldCore } from '../field';
import type { IFieldVisitor } from '../field-visitor.interface';
import { type ISingleLineTextFieldOptions } from './single-line-text-option.schema';
export declare const singleLineTextCelValueSchema: z.ZodString;
export type ISingleLineTextCellValue = z.infer<typeof singleLineTextCelValueSchema>;
export declare class SingleLineTextFieldCore extends FieldCore {
    type: FieldType.SingleLineText;
    options: ISingleLineTextFieldOptions;
    meta?: undefined;
    cellValueType: CellValueType.String;
    static defaultOptions(): ISingleLineTextFieldOptions;
    cellValue2String(cellValue?: unknown): string;
    item2String(value?: unknown): string;
    convertStringToCellValue(value: string): string | null;
    repair(value: unknown): string | null;
    validateOptions(): z.ZodSafeParseResult<{
        showAs?: {
            type: import("@teable/core").SingleLineTextDisplayType;
        } | undefined;
        defaultValue?: string | null | undefined;
    }>;
    validateCellValue(value: unknown): z.ZodSafeParseResult<string[] | null> | z.ZodSafeParseResult<string | null>;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
