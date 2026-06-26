import { CellValueType } from '../../models/field/constant';
import type { TypedValue } from '../typed-value';
import { FormulaFunc, FormulaFuncType, FunctionName } from './common';
declare abstract class ArrayFunc extends FormulaFunc {
    readonly type = FormulaFuncType.Array;
}
type IUnionType = string | number | boolean | null | IUnionType[];
export declare class CountAll extends ArrayFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<IUnionType>[]): number;
}
export declare class CountA extends ArrayFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<IUnionType>[]): number;
}
export declare class Count extends ArrayFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<IUnionType>[]): number;
}
export declare class ArrayJoin extends ArrayFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null | (string | null)[]>[]): string | null;
}
export declare class ArrayUnique extends ArrayFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params: TypedValue[]): {
        type: CellValueType;
        isMultiple: boolean;
    };
    eval(params: TypedValue<IUnionType>[]): IUnionType | null;
}
export declare class ArrayFlatten extends ArrayFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params: TypedValue[]): {
        type: CellValueType;
        isMultiple: boolean;
    };
    eval(params: TypedValue<IUnionType>[]): IUnionType | null;
}
export declare class ArrayCompact extends ArrayFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params: TypedValue[]): {
        type: CellValueType;
        isMultiple: boolean;
    };
    eval(params: TypedValue<IUnionType>[]): IUnionType | null;
}
export {};
