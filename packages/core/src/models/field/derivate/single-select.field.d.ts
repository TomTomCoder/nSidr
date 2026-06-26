import { z } from 'zod';
import type { FieldType, CellValueType } from '../constant';
import type { IFieldVisitor } from '../field-visitor.interface';
import { SelectFieldCore } from './abstract/select.field.abstract';
export declare const singleSelectCelValueSchema: z.ZodString;
export type ISingleSelectCellValue = z.infer<typeof singleSelectCelValueSchema>;
export declare class SingleSelectFieldCore extends SelectFieldCore {
    type: FieldType.SingleSelect;
    cellValueType: CellValueType.String;
    convertStringToCellValue(value: string, shouldExtend?: boolean): string | null;
    repair(value: unknown): string | null;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
