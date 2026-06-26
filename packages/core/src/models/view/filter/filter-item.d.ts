import { z } from 'zod';
import type { IOperator, ISymbol } from './operator';
export declare const modesRequiringDays: string[];
export declare const dateFilterSchema: z.ZodObject<{
    mode: z.ZodUnion<readonly [z.ZodLiteral<"today">, z.ZodLiteral<"tomorrow">, z.ZodLiteral<"yesterday">, z.ZodLiteral<"currentWeek">, z.ZodLiteral<"lastWeek">, z.ZodLiteral<"nextWeekPeriod">, z.ZodLiteral<"currentMonth">, z.ZodLiteral<"lastMonth">, z.ZodLiteral<"nextMonthPeriod">, z.ZodLiteral<"currentYear">, z.ZodLiteral<"lastYear">, z.ZodLiteral<"nextYearPeriod">, z.ZodLiteral<"oneWeekAgo">, z.ZodLiteral<"oneWeekFromNow">, z.ZodLiteral<"oneMonthAgo">, z.ZodLiteral<"oneMonthFromNow">, z.ZodLiteral<"daysAgo">, z.ZodLiteral<"daysFromNow">, z.ZodLiteral<"exactDate">, z.ZodLiteral<"exactFormatDate">, z.ZodLiteral<"dateRange">, z.ZodLiteral<"pastWeek">, z.ZodLiteral<"pastMonth">, z.ZodLiteral<"pastYear">, z.ZodLiteral<"nextWeek">, z.ZodLiteral<"nextMonth">, z.ZodLiteral<"nextYear">, z.ZodLiteral<"pastNumberOfDays">, z.ZodLiteral<"nextNumberOfDays">]>;
    numberOfDays: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    exactDate: z.ZodOptional<z.ZodString>;
    exactDateEnd: z.ZodOptional<z.ZodString>;
    timeZone: z.ZodString;
}, z.core.$strip>;
export type IDateFilter = z.infer<typeof dateFilterSchema>;
export declare const literalValueSchema: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>;
export type ILiteralValue = z.infer<typeof literalValueSchema>;
export declare const literalValueListSchema: z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
export type ILiteralValueList = z.infer<typeof literalValueListSchema>;
export declare const fieldReferenceValueSchema: z.ZodObject<{
    type: z.ZodLiteral<"field">;
    fieldId: z.ZodString;
    tableId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type IFieldReferenceValue = z.infer<typeof fieldReferenceValueSchema>;
export declare const filterValueSchema: z.ZodNullable<z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>, z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>, z.ZodObject<{
    mode: z.ZodUnion<readonly [z.ZodLiteral<"today">, z.ZodLiteral<"tomorrow">, z.ZodLiteral<"yesterday">, z.ZodLiteral<"currentWeek">, z.ZodLiteral<"lastWeek">, z.ZodLiteral<"nextWeekPeriod">, z.ZodLiteral<"currentMonth">, z.ZodLiteral<"lastMonth">, z.ZodLiteral<"nextMonthPeriod">, z.ZodLiteral<"currentYear">, z.ZodLiteral<"lastYear">, z.ZodLiteral<"nextYearPeriod">, z.ZodLiteral<"oneWeekAgo">, z.ZodLiteral<"oneWeekFromNow">, z.ZodLiteral<"oneMonthAgo">, z.ZodLiteral<"oneMonthFromNow">, z.ZodLiteral<"daysAgo">, z.ZodLiteral<"daysFromNow">, z.ZodLiteral<"exactDate">, z.ZodLiteral<"exactFormatDate">, z.ZodLiteral<"dateRange">, z.ZodLiteral<"pastWeek">, z.ZodLiteral<"pastMonth">, z.ZodLiteral<"pastYear">, z.ZodLiteral<"nextWeek">, z.ZodLiteral<"nextMonth">, z.ZodLiteral<"nextYear">, z.ZodLiteral<"pastNumberOfDays">, z.ZodLiteral<"nextNumberOfDays">]>;
    numberOfDays: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    exactDate: z.ZodOptional<z.ZodString>;
    exactDateEnd: z.ZodOptional<z.ZodString>;
    timeZone: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"field">;
    fieldId: z.ZodString;
    tableId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>]>>;
export type IFilterValue = z.infer<typeof filterValueSchema>;
export declare const isFieldReferenceValue: (value: unknown) => value is {
    type: "field";
    fieldId: string;
    tableId?: string | undefined;
};
export type IFilterOperator = IOperator;
export type IFilterSymbolOperator = ISymbol;
export declare const baseFilterOperatorSchema: z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodObject<{
    isSymbol: z.ZodOptional<z.ZodLiteral<false>>;
    fieldId: z.ZodString;
    value: z.ZodNullable<z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>, z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>, z.ZodObject<{
        mode: z.ZodUnion<readonly [z.ZodLiteral<"today">, z.ZodLiteral<"tomorrow">, z.ZodLiteral<"yesterday">, z.ZodLiteral<"currentWeek">, z.ZodLiteral<"lastWeek">, z.ZodLiteral<"nextWeekPeriod">, z.ZodLiteral<"currentMonth">, z.ZodLiteral<"lastMonth">, z.ZodLiteral<"nextMonthPeriod">, z.ZodLiteral<"currentYear">, z.ZodLiteral<"lastYear">, z.ZodLiteral<"nextYearPeriod">, z.ZodLiteral<"oneWeekAgo">, z.ZodLiteral<"oneWeekFromNow">, z.ZodLiteral<"oneMonthAgo">, z.ZodLiteral<"oneMonthFromNow">, z.ZodLiteral<"daysAgo">, z.ZodLiteral<"daysFromNow">, z.ZodLiteral<"exactDate">, z.ZodLiteral<"exactFormatDate">, z.ZodLiteral<"dateRange">, z.ZodLiteral<"pastWeek">, z.ZodLiteral<"pastMonth">, z.ZodLiteral<"pastYear">, z.ZodLiteral<"nextWeek">, z.ZodLiteral<"nextMonth">, z.ZodLiteral<"nextYear">, z.ZodLiteral<"pastNumberOfDays">, z.ZodLiteral<"nextNumberOfDays">]>;
        numberOfDays: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        exactDate: z.ZodOptional<z.ZodString>;
        exactDateEnd: z.ZodOptional<z.ZodString>;
        timeZone: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"field">;
        fieldId: z.ZodString;
        tableId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>;
    operator: z.ZodUnion<readonly [z.ZodLiteral<"is">, z.ZodLiteral<"isNot">, z.ZodLiteral<"contains">, z.ZodLiteral<"doesNotContain">, z.ZodLiteral<"isGreater">, z.ZodLiteral<"isGreaterEqual">, z.ZodLiteral<"isLess">, z.ZodLiteral<"isLessEqual">, z.ZodLiteral<"isEmpty">, z.ZodLiteral<"isNotEmpty">, z.ZodLiteral<"isAnyOf">, z.ZodLiteral<"isNoneOf">, z.ZodLiteral<"hasAnyOf">, z.ZodLiteral<"hasAllOf">, z.ZodLiteral<"isNotExactly">, z.ZodLiteral<"hasNoneOf">, z.ZodLiteral<"isExactly">, z.ZodLiteral<"isWithIn">, z.ZodLiteral<"isBefore">, z.ZodLiteral<"isAfter">, z.ZodLiteral<"isOnOrBefore">, z.ZodLiteral<"isOnOrAfter">]>;
}, z.core.$strip>>;
export declare const refineExtendedFilterOperatorSchema: <T extends {
    value: string | number | boolean | (string | number | boolean)[] | {
        mode: "today" | "tomorrow" | "yesterday" | "currentWeek" | "lastWeek" | "nextWeekPeriod" | "currentMonth" | "lastMonth" | "nextMonthPeriod" | "currentYear" | "lastYear" | "nextYearPeriod" | "oneWeekAgo" | "oneWeekFromNow" | "oneMonthAgo" | "oneMonthFromNow" | "daysAgo" | "daysFromNow" | "exactDate" | "exactFormatDate" | "dateRange" | "pastWeek" | "pastMonth" | "pastYear" | "nextWeek" | "nextMonth" | "nextYear" | "pastNumberOfDays" | "nextNumberOfDays";
        timeZone: string;
        numberOfDays?: number | undefined;
        exactDate?: string | undefined;
        exactDateEnd?: string | undefined;
    } | {
        type: "field";
        fieldId: string;
        tableId?: string | undefined;
    } | null;
    operator: "isEmpty" | "is" | "isNot" | "contains" | "doesNotContain" | "isGreater" | "isGreaterEqual" | "isLess" | "isLessEqual" | "isNotEmpty" | "isAnyOf" | "isNoneOf" | "hasAnyOf" | "hasAllOf" | "isNotExactly" | "hasNoneOf" | "isExactly" | "isWithIn" | "isBefore" | "isAfter" | "isOnOrBefore" | "isOnOrAfter";
}>(schema: z.ZodSchema<T>) => z.ZodSchema<T>;
export declare const filterOperatorSchema: z.ZodType<{
    fieldId: string;
    value: string | number | boolean | (string | number | boolean)[] | {
        mode: "today" | "tomorrow" | "yesterday" | "currentWeek" | "lastWeek" | "nextWeekPeriod" | "currentMonth" | "lastMonth" | "nextMonthPeriod" | "currentYear" | "lastYear" | "nextYearPeriod" | "oneWeekAgo" | "oneWeekFromNow" | "oneMonthAgo" | "oneMonthFromNow" | "daysAgo" | "daysFromNow" | "exactDate" | "exactFormatDate" | "dateRange" | "pastWeek" | "pastMonth" | "pastYear" | "nextWeek" | "nextMonth" | "nextYear" | "pastNumberOfDays" | "nextNumberOfDays";
        timeZone: string;
        numberOfDays?: number | undefined;
        exactDate?: string | undefined;
        exactDateEnd?: string | undefined;
    } | {
        type: "field";
        fieldId: string;
        tableId?: string | undefined;
    } | null;
    operator: "isEmpty" | "is" | "isNot" | "contains" | "doesNotContain" | "isGreater" | "isGreaterEqual" | "isLess" | "isLessEqual" | "isNotEmpty" | "isAnyOf" | "isNoneOf" | "hasAnyOf" | "hasAllOf" | "isNotExactly" | "hasNoneOf" | "isExactly" | "isWithIn" | "isBefore" | "isAfter" | "isOnOrBefore" | "isOnOrAfter";
    isSymbol?: false | undefined;
}, unknown, z.core.$ZodTypeInternals<{
    fieldId: string;
    value: string | number | boolean | (string | number | boolean)[] | {
        mode: "today" | "tomorrow" | "yesterday" | "currentWeek" | "lastWeek" | "nextWeekPeriod" | "currentMonth" | "lastMonth" | "nextMonthPeriod" | "currentYear" | "lastYear" | "nextYearPeriod" | "oneWeekAgo" | "oneWeekFromNow" | "oneMonthAgo" | "oneMonthFromNow" | "daysAgo" | "daysFromNow" | "exactDate" | "exactFormatDate" | "dateRange" | "pastWeek" | "pastMonth" | "pastYear" | "nextWeek" | "nextMonth" | "nextYear" | "pastNumberOfDays" | "nextNumberOfDays";
        timeZone: string;
        numberOfDays?: number | undefined;
        exactDate?: string | undefined;
        exactDateEnd?: string | undefined;
    } | {
        type: "field";
        fieldId: string;
        tableId?: string | undefined;
    } | null;
    operator: "isEmpty" | "is" | "isNot" | "contains" | "doesNotContain" | "isGreater" | "isGreaterEqual" | "isLess" | "isLessEqual" | "isNotEmpty" | "isAnyOf" | "isNoneOf" | "hasAnyOf" | "hasAllOf" | "isNotExactly" | "hasNoneOf" | "isExactly" | "isWithIn" | "isBefore" | "isAfter" | "isOnOrBefore" | "isOnOrAfter";
    isSymbol?: false | undefined;
}, unknown>>;
export declare const filterSymbolOperatorSchema: z.ZodObject<{
    isSymbol: z.ZodLiteral<true>;
    fieldId: z.ZodString;
    value: z.ZodNullable<z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>, z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>, z.ZodObject<{
        mode: z.ZodUnion<readonly [z.ZodLiteral<"today">, z.ZodLiteral<"tomorrow">, z.ZodLiteral<"yesterday">, z.ZodLiteral<"currentWeek">, z.ZodLiteral<"lastWeek">, z.ZodLiteral<"nextWeekPeriod">, z.ZodLiteral<"currentMonth">, z.ZodLiteral<"lastMonth">, z.ZodLiteral<"nextMonthPeriod">, z.ZodLiteral<"currentYear">, z.ZodLiteral<"lastYear">, z.ZodLiteral<"nextYearPeriod">, z.ZodLiteral<"oneWeekAgo">, z.ZodLiteral<"oneWeekFromNow">, z.ZodLiteral<"oneMonthAgo">, z.ZodLiteral<"oneMonthFromNow">, z.ZodLiteral<"daysAgo">, z.ZodLiteral<"daysFromNow">, z.ZodLiteral<"exactDate">, z.ZodLiteral<"exactFormatDate">, z.ZodLiteral<"dateRange">, z.ZodLiteral<"pastWeek">, z.ZodLiteral<"pastMonth">, z.ZodLiteral<"pastYear">, z.ZodLiteral<"nextWeek">, z.ZodLiteral<"nextMonth">, z.ZodLiteral<"nextYear">, z.ZodLiteral<"pastNumberOfDays">, z.ZodLiteral<"nextNumberOfDays">]>;
        numberOfDays: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        exactDate: z.ZodOptional<z.ZodString>;
        exactDateEnd: z.ZodOptional<z.ZodString>;
        timeZone: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"field">;
        fieldId: z.ZodString;
        tableId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>;
    operator: z.ZodUnion<readonly [z.ZodLiteral<"=">, z.ZodLiteral<"!=">, z.ZodLiteral<">">, z.ZodLiteral<">=">, z.ZodLiteral<"<">, z.ZodLiteral<"<=">, z.ZodLiteral<"LIKE">, z.ZodLiteral<"IN">, z.ZodLiteral<"HAS">, z.ZodLiteral<"NOT LIKE">, z.ZodLiteral<"NOT IN">, z.ZodLiteral<"IS NULL">, z.ZodLiteral<"IS NOT NULL">]>;
}, z.core.$strip>;
export declare const filterItemSchema: z.ZodUnion<readonly [z.ZodType<{
    fieldId: string;
    value: string | number | boolean | (string | number | boolean)[] | {
        mode: "today" | "tomorrow" | "yesterday" | "currentWeek" | "lastWeek" | "nextWeekPeriod" | "currentMonth" | "lastMonth" | "nextMonthPeriod" | "currentYear" | "lastYear" | "nextYearPeriod" | "oneWeekAgo" | "oneWeekFromNow" | "oneMonthAgo" | "oneMonthFromNow" | "daysAgo" | "daysFromNow" | "exactDate" | "exactFormatDate" | "dateRange" | "pastWeek" | "pastMonth" | "pastYear" | "nextWeek" | "nextMonth" | "nextYear" | "pastNumberOfDays" | "nextNumberOfDays";
        timeZone: string;
        numberOfDays?: number | undefined;
        exactDate?: string | undefined;
        exactDateEnd?: string | undefined;
    } | {
        type: "field";
        fieldId: string;
        tableId?: string | undefined;
    } | null;
    operator: "isEmpty" | "is" | "isNot" | "contains" | "doesNotContain" | "isGreater" | "isGreaterEqual" | "isLess" | "isLessEqual" | "isNotEmpty" | "isAnyOf" | "isNoneOf" | "hasAnyOf" | "hasAllOf" | "isNotExactly" | "hasNoneOf" | "isExactly" | "isWithIn" | "isBefore" | "isAfter" | "isOnOrBefore" | "isOnOrAfter";
    isSymbol?: false | undefined;
}, unknown, z.core.$ZodTypeInternals<{
    fieldId: string;
    value: string | number | boolean | (string | number | boolean)[] | {
        mode: "today" | "tomorrow" | "yesterday" | "currentWeek" | "lastWeek" | "nextWeekPeriod" | "currentMonth" | "lastMonth" | "nextMonthPeriod" | "currentYear" | "lastYear" | "nextYearPeriod" | "oneWeekAgo" | "oneWeekFromNow" | "oneMonthAgo" | "oneMonthFromNow" | "daysAgo" | "daysFromNow" | "exactDate" | "exactFormatDate" | "dateRange" | "pastWeek" | "pastMonth" | "pastYear" | "nextWeek" | "nextMonth" | "nextYear" | "pastNumberOfDays" | "nextNumberOfDays";
        timeZone: string;
        numberOfDays?: number | undefined;
        exactDate?: string | undefined;
        exactDateEnd?: string | undefined;
    } | {
        type: "field";
        fieldId: string;
        tableId?: string | undefined;
    } | null;
    operator: "isEmpty" | "is" | "isNot" | "contains" | "doesNotContain" | "isGreater" | "isGreaterEqual" | "isLess" | "isLessEqual" | "isNotEmpty" | "isAnyOf" | "isNoneOf" | "hasAnyOf" | "hasAllOf" | "isNotExactly" | "hasNoneOf" | "isExactly" | "isWithIn" | "isBefore" | "isAfter" | "isOnOrBefore" | "isOnOrAfter";
    isSymbol?: false | undefined;
}, unknown>>, z.ZodObject<{
    isSymbol: z.ZodLiteral<true>;
    fieldId: z.ZodString;
    value: z.ZodNullable<z.ZodUnion<readonly [z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>, z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>, z.ZodObject<{
        mode: z.ZodUnion<readonly [z.ZodLiteral<"today">, z.ZodLiteral<"tomorrow">, z.ZodLiteral<"yesterday">, z.ZodLiteral<"currentWeek">, z.ZodLiteral<"lastWeek">, z.ZodLiteral<"nextWeekPeriod">, z.ZodLiteral<"currentMonth">, z.ZodLiteral<"lastMonth">, z.ZodLiteral<"nextMonthPeriod">, z.ZodLiteral<"currentYear">, z.ZodLiteral<"lastYear">, z.ZodLiteral<"nextYearPeriod">, z.ZodLiteral<"oneWeekAgo">, z.ZodLiteral<"oneWeekFromNow">, z.ZodLiteral<"oneMonthAgo">, z.ZodLiteral<"oneMonthFromNow">, z.ZodLiteral<"daysAgo">, z.ZodLiteral<"daysFromNow">, z.ZodLiteral<"exactDate">, z.ZodLiteral<"exactFormatDate">, z.ZodLiteral<"dateRange">, z.ZodLiteral<"pastWeek">, z.ZodLiteral<"pastMonth">, z.ZodLiteral<"pastYear">, z.ZodLiteral<"nextWeek">, z.ZodLiteral<"nextMonth">, z.ZodLiteral<"nextYear">, z.ZodLiteral<"pastNumberOfDays">, z.ZodLiteral<"nextNumberOfDays">]>;
        numberOfDays: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        exactDate: z.ZodOptional<z.ZodString>;
        exactDateEnd: z.ZodOptional<z.ZodString>;
        timeZone: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"field">;
        fieldId: z.ZodString;
        tableId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>]>>;
    operator: z.ZodUnion<readonly [z.ZodLiteral<"=">, z.ZodLiteral<"!=">, z.ZodLiteral<">">, z.ZodLiteral<">=">, z.ZodLiteral<"<">, z.ZodLiteral<"<=">, z.ZodLiteral<"LIKE">, z.ZodLiteral<"IN">, z.ZodLiteral<"HAS">, z.ZodLiteral<"NOT LIKE">, z.ZodLiteral<"NOT IN">, z.ZodLiteral<"IS NULL">, z.ZodLiteral<"IS NOT NULL">]>;
}, z.core.$strip>]>;
export type IFilterItem = z.infer<typeof filterItemSchema>;
