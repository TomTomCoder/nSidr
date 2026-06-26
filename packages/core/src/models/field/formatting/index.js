"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormattingSchema = exports.getDefaultFormatting = exports.unionFormattingSchema = void 0;
const zod_1 = require("../../../zod");
const constant_1 = require("../constant");
const datetime_1 = require("./datetime");
const number_1 = require("./number");
__exportStar(require("./number"), exports);
__exportStar(require("./datetime"), exports);
__exportStar(require("./time-zone"), exports);
const translateNumberFormattingError = (issue) => {
    if (issue.code === 'invalid_union') {
        return 'Invalid "type" value. Must be one of: decimal, percent, currency';
    }
    if (issue.code === 'too_big' && issue.path[0] === 'precision') {
        return `Precision must be between 0 and ${issue.maximum}`;
    }
    if (issue.code === 'too_small' && issue.path[0] === 'precision') {
        return `Precision must be between ${issue.minimum} and 5`;
    }
    if (issue.code === 'invalid_type' && issue.path[0] === 'symbol') {
        return 'Currency formatting requires "symbol" field';
    }
    if (issue.code === 'unrecognized_keys') {
        return `Unrecognized fields: ${issue.keys?.join(', ')}`;
    }
    return `Invalid number formatting: ${issue.message}`;
};
const translateDatetimeFormattingError = (issue) => {
    if (issue.code === 'invalid_type' && issue.path[0] === 'date') {
        return 'Datetime formatting requires "date" field';
    }
    if (issue.code === 'invalid_type' && issue.path[0] === 'time') {
        return 'Datetime formatting requires "time" field';
    }
    if (issue.code === 'invalid_type' && issue.path[0] === 'timeZone') {
        return 'Datetime formatting requires "timeZone" field';
    }
    if (issue.code === 'invalid_value' && issue.path[0] === 'time') {
        return 'Invalid "time" value. Must be one of: HH:mm, hh:mm A, None';
    }
    return `Invalid datetime formatting: ${issue.message}`;
};
const createPreciseErrorMessage = (val) => {
    if (typeof val !== 'object' || val === null) {
        return 'Formatting must be an object';
    }
    const hasNumberOnlyFields = 'precision' in val || 'symbol' in val;
    const hasTypeField = 'type' in val;
    const hasDatetimeFields = 'date' in val || 'time' in val || 'timeZone' in val;
    const isNumberFormatting = hasNumberOnlyFields || hasTypeField;
    const isDatetimeFormatting = hasDatetimeFields;
    if (isNumberFormatting && isDatetimeFormatting) {
        return 'Cannot mix number formatting (type, precision, symbol) with datetime formatting (date, time, timeZone)';
    }
    if (isNumberFormatting) {
        if (!hasTypeField) {
            return 'Number formatting requires "type" field (decimal, percent, or currency)';
        }
        const result = number_1.numberFormattingSchema.safeParse(val);
        if (!result.success) {
            return translateNumberFormattingError(result.error.issues[0]);
        }
        return undefined;
    }
    if (isDatetimeFormatting) {
        const result = datetime_1.datetimeFormattingSchema.safeParse(val);
        if (!result.success) {
            return translateDatetimeFormattingError(result.error.issues[0]);
        }
        return undefined;
    }
    return 'Invalid formatting. Expected number formatting (type, precision) or datetime formatting (date, time, timeZone)';
};
exports.unionFormattingSchema = zod_1.z
    .any()
    // eslint-disable-next-line sonarjs/cognitive-complexity
    .superRefine((val, ctx) => {
    const errorMessage = createPreciseErrorMessage(val);
    if (errorMessage) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: errorMessage,
        });
    }
})
    .meta({
    description: 'Different cell value types are determined based on the results of expression parsing',
});
const getDefaultFormatting = (cellValueType) => {
    switch (cellValueType) {
        case constant_1.CellValueType.Number:
            return number_1.defaultNumberFormatting;
        case constant_1.CellValueType.DateTime:
            return datetime_1.defaultDatetimeFormatting;
    }
};
exports.getDefaultFormatting = getDefaultFormatting;
const getFormattingSchema = (cellValueType) => {
    switch (cellValueType) {
        case constant_1.CellValueType.Number:
            return number_1.numberFormattingSchema;
        case constant_1.CellValueType.DateTime:
            return datetime_1.datetimeFormattingSchema;
        default:
            return zod_1.z.undefined().meta({
                description: 'Only number and datetime cell value type support formatting',
            });
    }
};
exports.getFormattingSchema = getFormattingSchema;
