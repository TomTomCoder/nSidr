import { CellValueType } from '../../models/field/constant';
import type { TypedValue } from '../typed-value';
import { FormulaFunc, FormulaFuncType, FunctionName } from './common';
export declare const convertValueToString: (param?: TypedValue<string | number | boolean | null | (string | number | boolean | null)[]>, separator?: string) => string | null;
declare abstract class TextFunc extends FormulaFunc {
    readonly type = FormulaFuncType.Text;
}
export declare class Concatenate extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null | (string | number | null)[]>[]): string | null;
}
export declare class Find extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null | (string | number | null)[]>[]): number | null;
}
export declare class Search extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null | (string | number | null)[]>[]): number | null;
}
export declare class Mid extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null | (string | number | null)[]>[]): string | null;
}
export declare class Left extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null | (string | number | null)[]>[]): string | null;
}
export declare class Right extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null | (string | number | null)[]>[]): string | null;
}
export declare class Replace extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null | (string | number | null)[]>[]): string | null;
}
export declare class RegExpReplace extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null | (string | null)[]>[]): string | null;
}
export declare class Substitute extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null | (string | number | null)[]>[]): string | null;
}
export declare class TextBefore extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | boolean | null | (string | number | boolean | null)[]>[]): string | null;
}
export declare class TextSplit extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
        isMultiple: boolean;
    };
    eval(params: TypedValue<string | number | boolean | null | (string | number | boolean | null)[]>[]): string[] | null;
}
export declare class Lower extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null | (string | null)[]>[]): string | null;
}
export declare class Upper extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null | (string | null)[]>[]): string | null;
}
export declare class Rept extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null | (string | number | null)[]>[]): string | null;
}
export declare class Trim extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null | (string | null)[]>[]): string | null;
}
export declare class T extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | boolean | null | (string | number | boolean | null)[]>[]): string | null;
}
export declare class Len extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null | (string | null)[]>[]): number | null;
}
export declare class EncodeUrlComponent extends TextFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null | (string | null)[]>[]): string | null;
}
export {};
