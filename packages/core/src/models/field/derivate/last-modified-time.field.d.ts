import type { FieldType, CellValueType } from '../constant';
import type { IFieldVisitor } from '../field-visitor.interface';
import { FormulaAbstractCore } from './abstract/formula.field.abstract';
import type { IFormulaFieldMeta } from './formula-option.schema';
import type { ILastModifiedTimeFieldOptions, ILastModifiedTimeFieldOptionsRo } from './last-modified-time-option.schema';
export declare class LastModifiedTimeFieldCore extends FormulaAbstractCore {
    type: FieldType.LastModifiedTime;
    options: ILastModifiedTimeFieldOptions;
    meta?: IFormulaFieldMeta;
    cellValueType: CellValueType.DateTime;
    static defaultOptions(): ILastModifiedTimeFieldOptionsRo;
    validateOptions(): import("zod").ZodSafeParseResult<{
        [x: string]: unknown;
        expression: "LAST_MODIFIED_TIME()";
        formatting?: {
            date: string;
            time: import("../formatting").TimeFormatting;
            timeZone: string;
        } | undefined;
        trackedFieldIds?: string[] | undefined;
    }>;
    getExpression(): "LAST_MODIFIED_TIME()";
    getDatetimeFormatting(): {
        date: string;
        time: import("../formatting").TimeFormatting;
        timeZone: string;
    };
    getTrackedFieldIds(): string[];
    isTrackAll(): boolean;
    shouldUpdate(changedFieldIds: Set<string>): boolean;
    accept<T>(visitor: IFieldVisitor<T>): T;
}
