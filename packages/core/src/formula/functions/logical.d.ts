import { CellValueType } from '../../models/field/constant';
import type { TypedValue } from '../typed-value';
import { FormulaFunc, FormulaFuncType, FunctionName } from './common';
declare abstract class LogicalFunc extends FormulaFunc {
    readonly type = FormulaFuncType.Logical;
}
export declare class If extends LogicalFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
        isMultiple?: undefined;
    } | {
        type: CellValueType;
        isMultiple: boolean | undefined;
    };
    eval(params: TypedValue<string | number | boolean | (string | number | boolean | null)[]>[]): string | number | boolean | null | (string | number | boolean | null)[];
}
export declare class Switch extends LogicalFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
        isMultiple?: undefined;
    } | {
        type: CellValueType;
        isMultiple: boolean | undefined;
    };
    eval(params: TypedValue<string | number | boolean | (string | number | boolean | null)[]>[]): string | number | boolean | null | (string | number | boolean | null)[];
}
export declare class And extends LogicalFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<boolean | boolean[] | null[]>[]): boolean;
}
export declare class Or extends LogicalFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<boolean | boolean[] | null[]>[]): boolean;
}
export declare class Xor extends LogicalFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<boolean | boolean[] | null[]>[]): boolean;
}
export declare class Not extends LogicalFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<boolean | boolean[] | null[]>[]): boolean;
}
export declare class Blank extends LogicalFunc {
    name: FunctionName;
    acceptValueType: Set<never>;
    acceptMultipleValue: boolean;
    validateParams(): void;
    getReturnType(): {
        type: CellValueType;
    };
    eval(): null;
}
export declare class FormulaBaseError extends Error {
    constructor(message?: string);
}
export declare class FormulaError extends LogicalFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(): void;
    getReturnType(): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | string[] | null[]>[]): void;
}
export declare class IsError extends LogicalFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<boolean | boolean[] | null[]>[]): boolean;
}
export {};
