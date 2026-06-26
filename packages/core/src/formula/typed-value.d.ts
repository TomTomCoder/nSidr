import type { CellValueType } from '../models/field/constant';
import type { FieldCore } from '../models/field/field';
export declare class TypedValue<T = any> {
    value: T;
    type: CellValueType;
    isMultiple?: boolean | undefined;
    field?: FieldCore | undefined;
    isBlank?: boolean | undefined;
    constructor(value: T, type: CellValueType, isMultiple?: boolean | undefined, field?: FieldCore | undefined, isBlank?: boolean | undefined);
    toPlain(): any;
}
