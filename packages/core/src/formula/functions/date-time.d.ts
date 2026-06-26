import dayjs from 'dayjs';
import { CellValueType } from '../../models/field/constant';
import type { TypedValue } from '../typed-value';
import type { IFormulaContext } from './common';
import { FormulaFunc, FormulaFuncType, FunctionName } from './common';
export { dayjs };
declare abstract class DateTimeFunc extends FormulaFunc {
    readonly type = FormulaFuncType.DateTime;
}
export declare const getDayjs: (isoStr: string | null, timeZone: string, customFormat?: string) => dayjs.Dayjs | null;
export declare class Today extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<never>;
    acceptMultipleValue: boolean;
    validateParams(_params: TypedValue[]): void;
    getReturnType(): {
        type: CellValueType;
    };
    eval(_params: TypedValue[], context: IFormulaContext): string | null;
}
export declare class Now extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<never>;
    acceptMultipleValue: boolean;
    validateParams(_params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(_params: TypedValue[], context: IFormulaContext): string | null;
}
export declare class Year extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): number | null;
}
export declare class Month extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): number | null;
}
export declare class WeekNum extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): number | null;
}
export declare class Weekday extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): number | null;
}
export declare class Day extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): number | null;
}
export declare class Hour extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): number | null;
}
export declare class Minute extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): number | null;
}
export declare class Second extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): number | null;
}
export declare class FromNow extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | boolean | null>[], context: IFormulaContext): number | null;
}
export declare class ToNow extends FromNow {
    name: FunctionName;
    validateParams(params: TypedValue[]): void;
}
export declare class DatetimeDiff extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | boolean | null>[], context: IFormulaContext): number | null;
}
export declare class Workday extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null>[], context: IFormulaContext): string | null;
}
export declare class WorkdayDiff extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null>[], context: IFormulaContext): number | null;
}
export declare class IsSame extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): boolean | null;
}
export declare class IsAfter extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): boolean | null;
}
export declare class IsBefore extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): boolean | null;
}
export declare class DateAdd extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | number | null>[], context: IFormulaContext): string | null;
}
export declare class Datestr extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): string | null;
}
export declare class Timestr extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): string | null;
}
export declare class DatetimeFormat extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): string | null;
}
export declare class DatetimeParse extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): string | null;
}
export declare class CreatedTime extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(): void;
    getReturnType(): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): string | null;
}
export declare class LastModifiedTime extends DateTimeFunc {
    name: FunctionName;
    acceptValueType: Set<CellValueType>;
    acceptMultipleValue: boolean;
    validateParams(params: TypedValue[]): void;
    getReturnType(params?: TypedValue[]): {
        type: CellValueType;
    };
    eval(params: TypedValue<string | null>[], context: IFormulaContext): string | null;
}
