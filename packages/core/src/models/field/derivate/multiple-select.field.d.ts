import { z } from 'zod';
import type { FieldType, CellValueType } from '../constant';
import type { IFieldVisitor } from '../field-visitor.interface';
import { SelectFieldCore } from './abstract/select.field.abstract';
export declare const multipleSelectCelValueSchema: z.ZodArray<z.ZodString>;
export type IMultipleSelectCellValue = z.infer<typeof multipleSelectCelValueSchema>;
export declare class MultipleSelectFieldCore extends SelectFieldCore {
    type: FieldType.MultipleSelect;
    cellValueType: CellValueType.String;
    isMultipleCellValue: boolean;
    convertStringToCellValue(value: string, shouldExtend?: boolean): string[] | null;
    repair(value: unknown): any[] | null;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
