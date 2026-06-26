import { CellValueType } from '../../models/field/constant';
import type { TypedValue } from '../typed-value';
import type { IFormulaContext } from './common';
import { FormulaFunc, FormulaFuncType, FunctionName } from './common';
declare abstract class SystemFunc extends FormulaFunc {
    readonly type = FormulaFuncType.System;
}
export declare class TextAll extends SystemFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params: TypedValue[]): {
        type: CellValueType;
        isMultiple: boolean;
    } | {
        type: CellValueType;
        isMultiple?: undefined;
    };
    eval(params: TypedValue[]): boolean | number | string | (string | null)[] | null;
}
export declare class RecordId extends SystemFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(): void;
    getReturnType(): {
        type: CellValueType;
    };
    eval(_params: TypedValue<string | null>[], context: IFormulaContext): string;
}
export declare class AutoNumber extends SystemFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(): void;
    getReturnType(): {
        type: CellValueType;
    };
    eval(_params: TypedValue<string | null>[], context: IFormulaContext): number | null;
}
export {};
