import { z } from 'zod';
import type { FieldType, CellValueType } from '../constant';
import { FieldCore } from '../field';
import type { IFieldVisitor } from '../field-visitor.interface';
import { TimeFormatting } from '../formatting';
import type { IDateFieldOptions } from './date-option.schema';
export declare const dataFieldCellValueSchema: z.ZodString;
export type IDateCellValue = z.infer<typeof dataFieldCellValueSchema>;
export declare class DateFieldCore extends FieldCore {
    type: FieldType.Date;
    options: IDateFieldOptions;
    meta?: undefined;
    cellValueType: CellValueType.DateTime;
    static defaultOptions(): IDateFieldOptions;
    getDatetimeFormatting(): {
        date: string;
        time: TimeFormatting;
        timeZone: string;
    };
    cellValue2String(cellValue?: unknown): string;
    private defaultTzFormat;
    private parseUsingFieldFormatting;
    convertStringToCellValue(value: string): string | null;
    item2String(item?: unknown): string;
    repair(value: unknown): string | null;
    validateOptions(): z.ZodSafeParseResult<{
        formatting: {
            date: string;
            time: TimeFormatting;
            timeZone: string;
        };
        defaultValue?: "now" | null | undefined;
    }>;
    validateCellValue(cellValue: unknown): z.ZodSafeParseResult<string[] | null> | z.ZodSafeParseResult<string | null>;
    validateCellValueLoose(cellValue: unknown): z.ZodSafeParseResult<string[] | null> | z.ZodSafeParseResult<string | null>;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
