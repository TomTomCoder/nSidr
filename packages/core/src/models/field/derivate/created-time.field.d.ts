import type { FieldType, CellValueType } from '../constant';
import type { IFieldVisitor } from '../field-visitor.interface';
import { FormulaAbstractCore } from './abstract/formula.field.abstract';
import { type ICreatedTimeFieldOptions, type ICreatedTimeFieldOptionsRo } from './created-time-option.schema';
import type { IFormulaFieldMeta } from './formula-option.schema';
export declare class CreatedTimeFieldCore extends FormulaAbstractCore {
    type: FieldType.CreatedTime;
    options: ICreatedTimeFieldOptions;
    meta?: IFormulaFieldMeta;
    cellValueType: CellValueType.DateTime;
    getExpression(): "CREATED_TIME()";
    static defaultOptions(): ICreatedTimeFieldOptionsRo;
    getDatetimeFormatting(): {
        date: string;
        time: import("../formatting").TimeFormatting;
        timeZone: string;
    };
    validateOptions(): import("zod").ZodSafeParseResult<{
        formatting: {
            date: string;
            time: import("../formatting").TimeFormatting;
            timeZone: string;
        };
    }>;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
