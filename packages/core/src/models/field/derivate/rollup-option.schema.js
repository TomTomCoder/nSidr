"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollupFieldOptionsSchema = exports.isRollupFunctionSupportedForCellValueType = exports.getRollupFunctionsByCellValueType = exports.ROLLUP_FUNCTIONS = void 0;
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable @typescript-eslint/naming-convention */
const zod_1 = require("../../../zod");
const constant_1 = require("../constant");
const formatting_1 = require("../formatting");
const show_as_1 = require("../show-as");
exports.ROLLUP_FUNCTIONS = [
    'countall({values})',
    'counta({values})',
    'count({values})',
    'sum({values})',
    'average({values})',
    'max({values})',
    'min({values})',
    'and({values})',
    'or({values})',
    'xor({values})',
    'array_join({values})',
    'array_unique({values})',
    'array_compact({values})',
    'concatenate({values})',
];
const BASE_ROLLUP_FUNCTIONS = [
    'countall({values})',
    'counta({values})',
    'count({values})',
    'array_join({values})',
    'array_unique({values})',
    'array_compact({values})',
    'concatenate({values})',
];
const NUMBER_ROLLUP_FUNCTIONS = [
    'sum({values})',
    'average({values})',
    'max({values})',
    'min({values})',
];
const DATETIME_ROLLUP_FUNCTIONS = ['max({values})', 'min({values})'];
const BOOLEAN_ROLLUP_FUNCTIONS = [
    'and({values})',
    'or({values})',
    'xor({values})',
];
const getRollupFunctionsByCellValueType = (cellValueType) => {
    const allowed = new Set(BASE_ROLLUP_FUNCTIONS);
    switch (cellValueType) {
        case constant_1.CellValueType.Number:
            NUMBER_ROLLUP_FUNCTIONS.forEach((fn) => allowed.add(fn));
            break;
        case constant_1.CellValueType.DateTime:
            DATETIME_ROLLUP_FUNCTIONS.forEach((fn) => allowed.add(fn));
            break;
        case constant_1.CellValueType.Boolean:
            BOOLEAN_ROLLUP_FUNCTIONS.forEach((fn) => allowed.add(fn));
            break;
        case constant_1.CellValueType.String:
        default:
            break;
    }
    return exports.ROLLUP_FUNCTIONS.filter((fn) => allowed.has(fn));
};
exports.getRollupFunctionsByCellValueType = getRollupFunctionsByCellValueType;
const isRollupFunctionSupportedForCellValueType = (expression, cellValueType) => {
    return (0, exports.getRollupFunctionsByCellValueType)(cellValueType).includes(expression);
};
exports.isRollupFunctionSupportedForCellValueType = isRollupFunctionSupportedForCellValueType;
exports.rollupFieldOptionsSchema = zod_1.z.object({
    expression: zod_1.z.enum(exports.ROLLUP_FUNCTIONS),
    timeZone: formatting_1.timeZoneStringSchema.optional(),
    formatting: formatting_1.unionFormattingSchema.optional(),
    showAs: show_as_1.unionShowAsSchema.optional(),
});
