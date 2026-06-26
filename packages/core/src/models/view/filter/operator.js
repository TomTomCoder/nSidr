"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pastNumberOfDays = exports.nextYear = exports.nextMonth = exports.nextWeek = exports.pastYear = exports.pastMonth = exports.pastWeek = exports.dateRange = exports.exactFormatDate = exports.exactDate = exports.daysFromNow = exports.daysAgo = exports.oneMonthFromNow = exports.oneMonthAgo = exports.oneWeekFromNow = exports.oneWeekAgo = exports.nextYearPeriod = exports.nextMonthPeriod = exports.nextWeekPeriod = exports.lastYear = exports.lastMonth = exports.lastWeek = exports.currentYear = exports.currentMonth = exports.currentWeek = exports.yesterday = exports.tomorrow = exports.today = exports.isOnOrAfter = exports.isOnOrBefore = exports.isAfter = exports.isBefore = exports.isWithIn = exports.isExactly = exports.hasNoneOf = exports.isNotExactly = exports.hasAllOf = exports.hasAnyOf = exports.isNoneOf = exports.isAnyOf = exports.isLessEqual = exports.isLess = exports.isGreaterEqual = exports.isGreater = exports.isNotEmpty = exports.isEmpty = exports.doesNotContain = exports.contains = exports.isNot = exports.is = void 0;
exports.getValidFilterSubOperators = exports.getValidFilterOperators = exports.getFilterOperatorMapping = exports.dateTimeFieldValidSubOperatorsByIsWithin = exports.dateTimeFieldSubOperatorsByIsWithin = exports.dateTimeFieldValidSubOperators = exports.dateTimeFieldSubOperators = exports.dateTimeFieldValidOperators = exports.dateTimeFieldOperators = exports.booleanFieldValidOperators = exports.booleanFieldOperators = exports.numberFieldValidOperators = exports.numberFieldOperators = exports.textFieldValidOperators = exports.textFieldOperators = exports.symbols = exports.$isWithIn = exports.$isNotNull = exports.$isNull = exports.$notIn = exports.$notLike = exports.$between = exports.$has = exports.$in = exports.$like = exports.$lte = exports.$lt = exports.$gte = exports.$gt = exports.$neq = exports.$eq = exports.subOperators = exports.operators = exports.nextNumberOfDays = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const lodash_1 = require("lodash");
const zod_1 = require("zod");
const constant_1 = require("../../field/constant");
exports.is = zod_1.z.literal('is');
exports.isNot = zod_1.z.literal('isNot');
exports.contains = zod_1.z.literal('contains');
exports.doesNotContain = zod_1.z.literal('doesNotContain');
exports.isEmpty = zod_1.z.literal('isEmpty');
exports.isNotEmpty = zod_1.z.literal('isNotEmpty');
exports.isGreater = zod_1.z.literal('isGreater');
exports.isGreaterEqual = zod_1.z.literal('isGreaterEqual');
exports.isLess = zod_1.z.literal('isLess');
exports.isLessEqual = zod_1.z.literal('isLessEqual');
exports.isAnyOf = zod_1.z.literal('isAnyOf');
exports.isNoneOf = zod_1.z.literal('isNoneOf');
exports.hasAnyOf = zod_1.z.literal('hasAnyOf');
exports.hasAllOf = zod_1.z.literal('hasAllOf');
exports.isNotExactly = zod_1.z.literal('isNotExactly');
exports.hasNoneOf = zod_1.z.literal('hasNoneOf');
exports.isExactly = zod_1.z.literal('isExactly');
exports.isWithIn = zod_1.z.literal('isWithIn');
exports.isBefore = zod_1.z.literal('isBefore');
exports.isAfter = zod_1.z.literal('isAfter');
exports.isOnOrBefore = zod_1.z.literal('isOnOrBefore');
exports.isOnOrAfter = zod_1.z.literal('isOnOrAfter');
// date sub operation
exports.today = zod_1.z.literal('today');
exports.tomorrow = zod_1.z.literal('tomorrow');
exports.yesterday = zod_1.z.literal('yesterday');
exports.currentWeek = zod_1.z.literal('currentWeek');
exports.currentMonth = zod_1.z.literal('currentMonth');
exports.currentYear = zod_1.z.literal('currentYear');
exports.lastWeek = zod_1.z.literal('lastWeek');
exports.lastMonth = zod_1.z.literal('lastMonth');
exports.lastYear = zod_1.z.literal('lastYear');
exports.nextWeekPeriod = zod_1.z.literal('nextWeekPeriod');
exports.nextMonthPeriod = zod_1.z.literal('nextMonthPeriod');
exports.nextYearPeriod = zod_1.z.literal('nextYearPeriod');
exports.oneWeekAgo = zod_1.z.literal('oneWeekAgo');
exports.oneWeekFromNow = zod_1.z.literal('oneWeekFromNow');
exports.oneMonthAgo = zod_1.z.literal('oneMonthAgo');
exports.oneMonthFromNow = zod_1.z.literal('oneMonthFromNow');
exports.daysAgo = zod_1.z.literal('daysAgo');
exports.daysFromNow = zod_1.z.literal('daysFromNow');
exports.exactDate = zod_1.z.literal('exactDate');
exports.exactFormatDate = zod_1.z.literal('exactFormatDate');
exports.dateRange = zod_1.z.literal('dateRange');
// date sub operation by isWithin
exports.pastWeek = zod_1.z.literal('pastWeek');
exports.pastMonth = zod_1.z.literal('pastMonth');
exports.pastYear = zod_1.z.literal('pastYear');
exports.nextWeek = zod_1.z.literal('nextWeek');
exports.nextMonth = zod_1.z.literal('nextMonth');
exports.nextYear = zod_1.z.literal('nextYear');
exports.pastNumberOfDays = zod_1.z.literal('pastNumberOfDays');
exports.nextNumberOfDays = zod_1.z.literal('nextNumberOfDays');
exports.operators = zod_1.z.union([
    exports.is,
    exports.isNot,
    exports.contains,
    exports.doesNotContain,
    exports.isGreater,
    exports.isGreaterEqual,
    exports.isLess,
    exports.isLessEqual,
    exports.isEmpty,
    exports.isNotEmpty,
    exports.isAnyOf,
    exports.isNoneOf,
    exports.hasAnyOf,
    exports.hasAllOf,
    exports.isNotExactly,
    exports.hasNoneOf,
    exports.isExactly,
    exports.isWithIn,
    exports.isBefore,
    exports.isAfter,
    exports.isOnOrBefore,
    exports.isOnOrAfter,
]);
exports.subOperators = zod_1.z.union([
    // date sub operation
    exports.today,
    exports.tomorrow,
    exports.yesterday,
    exports.currentWeek,
    exports.lastWeek,
    exports.nextWeekPeriod,
    exports.currentMonth,
    exports.lastMonth,
    exports.nextMonthPeriod,
    exports.currentYear,
    exports.lastYear,
    exports.nextYearPeriod,
    exports.oneWeekAgo,
    exports.oneWeekFromNow,
    exports.oneMonthAgo,
    exports.oneMonthFromNow,
    exports.daysAgo,
    exports.daysFromNow,
    exports.exactDate,
    exports.exactFormatDate,
    exports.dateRange,
    // date sub operation by isWithin
    exports.pastWeek,
    exports.pastMonth,
    exports.pastYear,
    exports.nextWeek,
    exports.nextMonth,
    exports.nextYear,
    exports.pastNumberOfDays,
    exports.nextNumberOfDays,
]);
/*  antlr4ts char  */
exports.$eq = zod_1.z.literal('=');
exports.$neq = zod_1.z.literal('!=');
exports.$gt = zod_1.z.literal('>');
exports.$gte = zod_1.z.literal('>=');
exports.$lt = zod_1.z.literal('<');
exports.$lte = zod_1.z.literal('<=');
exports.$like = zod_1.z.literal('LIKE');
exports.$in = zod_1.z.literal('IN');
exports.$has = zod_1.z.literal('HAS');
exports.$between = zod_1.z.literal('BETWEEN');
exports.$notLike = zod_1.z.literal('NOT LIKE');
exports.$notIn = zod_1.z.literal('NOT IN');
exports.$isNull = zod_1.z.literal('IS NULL');
exports.$isNotNull = zod_1.z.literal('IS NOT NULL');
exports.$isWithIn = zod_1.z.literal('IS WITH IN');
exports.symbols = zod_1.z.union([
    exports.$eq,
    exports.$neq,
    exports.$gt,
    exports.$gte,
    exports.$lt,
    exports.$lte,
    exports.$like,
    exports.$in,
    exports.$has,
    exports.$notLike,
    exports.$notIn,
    exports.$isNull,
    exports.$isNotNull,
]);
const mappingOperatorSymbol = {
    [exports.is.value]: exports.$eq.value,
    [exports.isExactly.value]: exports.$eq.value,
    [exports.isNot.value]: exports.$neq.value,
    [exports.isGreater.value]: exports.$gt.value,
    [exports.isAfter.value]: exports.$gt.value,
    [exports.isGreaterEqual.value]: exports.$gte.value,
    [exports.isOnOrAfter.value]: exports.$gte.value,
    [exports.isLess.value]: exports.$lt.value,
    [exports.isBefore.value]: exports.$lt.value,
    [exports.isLessEqual.value]: exports.$lte.value,
    [exports.isOnOrBefore.value]: exports.$lte.value,
    [exports.contains.value]: exports.$like.value,
    [exports.doesNotContain.value]: exports.$notLike.value,
    [exports.isAnyOf.value]: exports.$in.value,
    [exports.hasAnyOf.value]: exports.$in.value,
    [exports.isNoneOf.value]: exports.$notIn.value,
    [exports.hasNoneOf.value]: exports.$notIn.value,
    [exports.hasAllOf.value]: exports.$has.value,
    [exports.isNotExactly.value]: exports.$neq.value,
    // [isWithIn.value]: $between.value,
    [exports.isEmpty.value]: exports.$isNull.value,
    [exports.isNotEmpty.value]: exports.$isNotNull.value,
    [exports.isWithIn.value]: exports.$isWithIn.value,
};
/*  antlr4ts char  */
exports.textFieldOperators = zod_1.z.union([
    exports.is,
    exports.isNot,
    exports.contains,
    exports.doesNotContain,
    exports.isEmpty,
    exports.isNotEmpty,
]);
exports.textFieldValidOperators = [
    exports.is.value,
    exports.isNot.value,
    exports.contains.value,
    exports.doesNotContain.value,
    exports.isEmpty.value,
    exports.isNotEmpty.value,
];
exports.numberFieldOperators = zod_1.z.union([
    exports.is,
    exports.isNot,
    exports.isGreater,
    exports.isGreaterEqual,
    exports.isLess,
    exports.isLessEqual,
    exports.isEmpty,
    exports.isNotEmpty,
]);
exports.numberFieldValidOperators = [
    exports.is.value,
    exports.isNot.value,
    exports.isGreater.value,
    exports.isGreaterEqual.value,
    exports.isLess.value,
    exports.isLessEqual.value,
    exports.isEmpty.value,
    exports.isNotEmpty.value,
];
exports.booleanFieldOperators = exports.is;
exports.booleanFieldValidOperators = [exports.is.value];
exports.dateTimeFieldOperators = zod_1.z.union([
    exports.is,
    exports.isNot,
    exports.isWithIn,
    exports.isBefore,
    exports.isAfter,
    exports.isOnOrBefore,
    exports.isOnOrAfter,
    exports.isEmpty,
    exports.isNotEmpty,
]);
exports.dateTimeFieldValidOperators = [
    exports.is.value,
    exports.isNot.value,
    exports.isWithIn.value,
    exports.isBefore.value,
    exports.isAfter.value,
    exports.isOnOrBefore.value,
    exports.isOnOrAfter.value,
    exports.isEmpty.value,
    exports.isNotEmpty.value,
];
exports.dateTimeFieldSubOperators = zod_1.z.union([
    exports.today,
    exports.tomorrow,
    exports.yesterday,
    exports.currentWeek,
    exports.lastWeek,
    exports.nextWeekPeriod,
    exports.currentMonth,
    exports.lastMonth,
    exports.nextMonthPeriod,
    exports.currentYear,
    exports.lastYear,
    exports.nextYearPeriod,
    exports.oneWeekAgo,
    exports.oneWeekFromNow,
    exports.oneMonthAgo,
    exports.oneMonthFromNow,
    exports.daysAgo,
    exports.daysFromNow,
    exports.exactDate,
    exports.exactFormatDate,
    exports.dateRange,
]);
exports.dateTimeFieldValidSubOperators = [
    exports.today.value,
    exports.tomorrow.value,
    exports.yesterday.value,
    exports.currentWeek.value,
    exports.lastWeek.value,
    exports.nextWeekPeriod.value,
    exports.currentMonth.value,
    exports.lastMonth.value,
    exports.nextMonthPeriod.value,
    exports.currentYear.value,
    exports.lastYear.value,
    exports.nextYearPeriod.value,
    exports.oneWeekAgo.value,
    exports.oneWeekFromNow.value,
    exports.oneMonthAgo.value,
    exports.oneMonthFromNow.value,
    exports.daysAgo.value,
    exports.daysFromNow.value,
    exports.exactDate.value,
    exports.exactFormatDate.value,
    exports.dateRange.value,
];
exports.dateTimeFieldSubOperatorsByIsWithin = zod_1.z.union([
    exports.today,
    exports.tomorrow,
    exports.yesterday,
    exports.currentWeek,
    exports.lastWeek,
    exports.nextWeekPeriod,
    exports.currentMonth,
    exports.lastMonth,
    exports.nextMonthPeriod,
    exports.currentYear,
    exports.lastYear,
    exports.nextYearPeriod,
    exports.oneWeekAgo,
    exports.oneWeekFromNow,
    exports.oneMonthAgo,
    exports.oneMonthFromNow,
    exports.daysAgo,
    exports.daysFromNow,
    exports.exactDate,
    exports.exactFormatDate,
    exports.pastWeek,
    exports.pastMonth,
    exports.pastYear,
    exports.nextWeek,
    exports.nextMonth,
    exports.nextYear,
    exports.pastNumberOfDays,
    exports.nextNumberOfDays,
]);
exports.dateTimeFieldValidSubOperatorsByIsWithin = [
    exports.today.value,
    exports.tomorrow.value,
    exports.yesterday.value,
    exports.currentWeek.value,
    exports.lastWeek.value,
    exports.nextWeekPeriod.value,
    exports.currentMonth.value,
    exports.lastMonth.value,
    exports.nextMonthPeriod.value,
    exports.currentYear.value,
    exports.lastYear.value,
    exports.nextYearPeriod.value,
    exports.oneWeekAgo.value,
    exports.oneWeekFromNow.value,
    exports.oneMonthAgo.value,
    exports.oneMonthFromNow.value,
    exports.daysAgo.value,
    exports.daysFromNow.value,
    exports.exactDate.value,
    exports.exactFormatDate.value,
    exports.pastWeek.value,
    exports.pastMonth.value,
    exports.pastYear.value,
    exports.nextWeek.value,
    exports.nextMonth.value,
    exports.nextYear.value,
    exports.pastNumberOfDays.value,
    exports.nextNumberOfDays.value,
];
function getFilterOperatorMapping(field) {
    const validFilterOperators = getValidFilterOperators(field);
    return (0, lodash_1.pick)(mappingOperatorSymbol, validFilterOperators);
}
exports.getFilterOperatorMapping = getFilterOperatorMapping;
/**
 * Returns the valid filter operators for a given field value type.
 */
function getValidFilterOperators(field) {
    let operationSet = [];
    const { cellValueType, type, isMultipleCellValue } = field;
    // 1. First determine the operator roughly according to cellValueType
    switch (cellValueType) {
        case constant_1.CellValueType.String: {
            operationSet = [...exports.textFieldValidOperators];
            break;
        }
        case constant_1.CellValueType.Number: {
            operationSet = [...exports.numberFieldValidOperators];
            break;
        }
        case constant_1.CellValueType.Boolean: {
            operationSet = [...exports.booleanFieldValidOperators];
            break;
        }
        case constant_1.CellValueType.DateTime: {
            operationSet = [...exports.dateTimeFieldValidOperators];
            break;
        }
    }
    // 2. Then repair the operator according to fieldType
    switch (type) {
        case constant_1.FieldType.SingleSelect: {
            if (isMultipleCellValue) {
                operationSet = [
                    exports.hasAnyOf.value,
                    exports.hasAllOf.value,
                    exports.isExactly.value,
                    exports.isNotExactly.value,
                    exports.hasNoneOf.value,
                    exports.isEmpty.value,
                    exports.isNotEmpty.value,
                ];
            }
            else {
                (0, lodash_1.pullAll)(operationSet, [exports.contains.value, exports.doesNotContain.value]);
                operationSet.splice(2, 0, exports.isAnyOf.value, exports.isNoneOf.value);
            }
            break;
        }
        case constant_1.FieldType.MultipleSelect: {
            operationSet = [
                exports.hasAnyOf.value,
                exports.hasAllOf.value,
                exports.isExactly.value,
                exports.isNotExactly.value,
                exports.hasNoneOf.value,
                exports.isEmpty.value,
                exports.isNotEmpty.value,
            ];
            break;
        }
        case constant_1.FieldType.User:
        case constant_1.FieldType.CreatedBy:
        case constant_1.FieldType.LastModifiedBy:
        case constant_1.FieldType.Link: {
            operationSet = isMultipleCellValue
                ? [exports.hasAnyOf.value, exports.hasAllOf.value, exports.isExactly.value, exports.hasNoneOf.value, exports.isNotExactly.value]
                : [exports.is.value, exports.isNot.value, exports.isAnyOf.value, exports.isNoneOf.value];
            const fixLinkOperator = type === constant_1.FieldType.Link ? [exports.contains.value, exports.doesNotContain.value] : [];
            operationSet = [...operationSet, ...fixLinkOperator, exports.isEmpty.value, exports.isNotEmpty.value];
            break;
        }
        case constant_1.FieldType.Attachment: {
            operationSet = [exports.isEmpty.value, exports.isNotEmpty.value];
            break;
        }
    }
    return (0, lodash_1.uniq)(operationSet);
}
exports.getValidFilterOperators = getValidFilterOperators;
function getValidFilterSubOperators(fieldType, parentOperator) {
    if (fieldType !== constant_1.FieldType.Date) {
        return undefined;
    }
    if (parentOperator === exports.isWithIn.value) {
        return exports.dateTimeFieldValidSubOperatorsByIsWithin;
    }
    // dateRange is only available for 'is' operator
    if (parentOperator === exports.is.value) {
        return exports.dateTimeFieldValidSubOperators;
    }
    return exports.dateTimeFieldValidSubOperators.filter((op) => op !== exports.dateRange.value);
}
exports.getValidFilterSubOperators = getValidFilterSubOperators;
