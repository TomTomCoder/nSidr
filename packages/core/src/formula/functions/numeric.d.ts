import { CellValueType } from '../../models/field/constant';
import type { TypedValue } from '../typed-value';
import { FormulaFunc, FormulaFuncType, FunctionName } from './common';
declare abstract class NumericFunc extends FormulaFunc {
    readonly type = FormulaFuncType.Numeric;
}
export declare class Sum extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null | (number | null)[]>[]): number | null;
}
export declare class Average extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null | (number | null)[]>[]): number | null;
}
export declare class Max extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | string | null | (number | string | null)[]>[]): number | string | null;
}
export declare class Min extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | string | null | (number | string | null)[]>[]): number | string | null;
}
export declare class Round extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class RoundUp extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class RoundDown extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class Ceiling extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class Floor extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class Even extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number>[]): number | null;
}
export declare class Odd extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number>[]): number | null;
}
export declare class Int extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class Abs extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class Sqrt extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class Power extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class Exp extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class Log extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class Mod extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<number | null>[]): number | null;
}
export declare class Value extends NumericFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[]): number | null;
}
export {};
