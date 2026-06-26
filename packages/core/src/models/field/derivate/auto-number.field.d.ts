import { z } from 'zod';
import type { FieldType, CellValueType } from '../constant';
import type { IFieldVisitor } from '../field-visitor.interface';
import { FormulaAbstractCore } from './abstract/formula.field.abstract';
import { type IAutoNumberFieldOptions, type IAutoNumberFieldOptionsRo } from './auto-number-option.schema';
import type { IFormulaFieldMeta } from './formula-option.schema';
export declare const autoNumberCellValueSchema: z.ZodNumber;
export declare class AutoNumberFieldCore extends FormulaAbstractCore {
    type: FieldType.AutoNumber;
    options: IAutoNumberFieldOptions;
    meta?: IFormulaFieldMeta;
    cellValueType: CellValueType.Number;
    static defaultOptions(): IAutoNumberFieldOptionsRo;
    cellValue2String(cellValue?: unknown): string;
    item2String(value?: unknown): string;
    validateOptions(): z.ZodSafeParseResult<Record<string, never>>;
    validateCellValue(value: unknown): z.ZodSafeParseResult<number | null> | z.ZodSafeParseResult<number[] | null>;
    getIsPersistedAsGeneratedColumn(): boolean;
    getExpression(): "AUTO_NUMBER()";
    accept<T>(visitor: IFieldVisitor<T>): T;
}
