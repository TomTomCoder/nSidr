import { z } from 'zod';
import { Colors } from '../colors';
import type { FieldType, CellValueType } from '../constant';
import { FieldCore } from '../field';
import type { IFieldVisitor } from '../field-visitor.interface';
import type { IButtonFieldOptions } from './button-option.schema';
export declare const buttonFieldCelValueSchema: z.ZodObject<{
    count: z.ZodNumber;
}, z.core.$strip>;
export type IButtonFieldCellValue = z.infer<typeof buttonFieldCelValueSchema>;
export declare class ButtonFieldCore extends FieldCore {
    type: FieldType.Button;
    options: IButtonFieldOptions;
    meta?: undefined;
    cellValueType: CellValueType.String;
    static defaultOptions(): IButtonFieldOptions;
    cellValue2String(_cellValue?: unknown): string;
    item2String(_value?: unknown): string;
    convertStringToCellValue(_value: string): string | null;
    repair(_value: unknown): null;
    validateOptions(): z.ZodSafeParseResult<{
        label: string;
        color: Colors;
        maxCount?: number | undefined;
        resetCount?: boolean | undefined;
        workflow?: {
            id?: string | undefined;
            name?: string | undefined;
            isActive?: boolean | undefined;
        } | null | undefined;
        confirm?: {
            title?: string | undefined;
            description?: string | undefined;
            confirmText?: string | undefined;
        } | null | undefined;
    }>;
    validateCellValue(value: unknown): z.ZodSafeParseResult<{
        count: number;
    }[] | null> | z.ZodSafeParseResult<{
        count: number;
    } | null>;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
