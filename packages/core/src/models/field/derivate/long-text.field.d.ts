import { z } from 'zod';
import type { CellValueType, FieldType } from '../constant';
import { FieldCore } from '../field';
import type { IFieldVisitor } from '../field-visitor.interface';
import { type ILongTextFieldOptions } from './long-text-option.schema';
export declare const longTextCelValueSchema: z.ZodString;
export type ILongTextCellValue = z.infer<typeof longTextCelValueSchema>;
export declare class LongTextFieldCore extends FieldCore {
    type: FieldType.LongText;
    options: ILongTextFieldOptions;
    meta?: undefined;
    cellValueType: CellValueType.String;
    static defaultOptions(): ILongTextFieldOptions;
    cellValue2String(cellValue?: unknown): string;
    item2String(value?: unknown): string;
    convertStringToCellValue(value: string): string | null;
    repair(value: unknown): string | null;
    validateOptions(): z.ZodSafeParseResult<{
        showAs?: {
            type: "markdown";
        } | null | undefined;
        defaultValue?: string | null | undefined;
    }>;
    validateCellValue(value: unknown): z.ZodSafeParseResult<string[] | null> | z.ZodSafeParseResult<string | null>;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
