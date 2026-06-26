import type { RootContext } from '@teable/formula';
import { z } from 'zod';
import type { IRecord } from '../../../record';
import { CellValueType } from '../../constant';
import { FieldCore } from '../../field';
import type { IUnionFormatting } from '../../formatting';
export declare const getFormulaCellValueSchema: (cellValueType: CellValueType) => z.ZodString | z.ZodNumber | z.ZodBoolean;
export declare abstract class FormulaAbstractCore extends FieldCore {
    static parse(expression: string): RootContext;
    options: {
        expression: string;
        formatting?: IUnionFormatting;
    };
    cellValueType: CellValueType;
    isMultipleCellValue?: boolean | undefined;
    protected _tree?: RootContext;
    protected get tree(): RootContext;
    evaluate(dependFieldMap: {
        [fieldId: string]: FieldCore;
    }, record: IRecord): import("@teable/core").TypedValue<any>;
    cellValue2String(cellValue?: unknown): string;
    convertStringToCellValue(_value: string): null;
    item2String(value?: unknown): string;
    repair(_value: unknown): null;
    validateCellValue(value: unknown): z.ZodSafeParseResult<string | null> | z.ZodSafeParseResult<(string | number | boolean)[] | null> | z.ZodSafeParseResult<boolean | null> | z.ZodSafeParseResult<number | null>;
}
