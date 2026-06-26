import { z } from 'zod';
import type { FieldType, CellValueType } from '../constant';
import { FieldCore } from '../field';
import type { IFieldVisitor } from '../field-visitor.interface';
import type { ICheckboxFieldOptions } from './checkbox-option.schema';
export declare const booleanCellValueSchema: z.ZodBoolean;
export type ICheckboxCellValue = z.infer<typeof booleanCellValueSchema>;
export declare class CheckboxFieldCore extends FieldCore {
    type: FieldType.Checkbox;
    options: ICheckboxFieldOptions;
    meta?: undefined;
    cellValueType: CellValueType.Boolean;
    static defaultOptions(): ICheckboxFieldOptions;
    cellValue2String(cellValue?: unknown): string;
    convertStringToCellValue(value: string): boolean | null;
    repair(value: unknown): true | null;
    item2String(item?: unknown): "" | "true";
    validateOptions(): z.ZodSafeParseResult<{
        defaultValue?: boolean | null | undefined;
    }>;
    validateCellValue(value: unknown): z.ZodSafeParseResult<true[] | null> | z.ZodSafeParseResult<true | null>;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
