"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterItemSchema = exports.filterSymbolOperatorSchema = exports.filterOperatorSchema = exports.refineExtendedFilterOperatorSchema = exports.baseFilterOperatorSchema = exports.isFieldReferenceValue = exports.filterValueSchema = exports.fieldReferenceValueSchema = exports.literalValueListSchema = exports.literalValueSchema = exports.dateFilterSchema = exports.modesRequiringDays = void 0;
const zod_1 = require("zod");
const date_field_1 = require("../../field/derivate/date.field");
const time_zone_1 = require("../../field/formatting/time-zone");
const operator_1 = require("./operator");
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.modesRequiringDays = [
    operator_1.daysAgo.value,
    operator_1.daysFromNow.value,
    operator_1.pastNumberOfDays.value,
    operator_1.nextNumberOfDays.value,
];
exports.dateFilterSchema = zod_1.z
    .object({
    mode: operator_1.subOperators,
    numberOfDays: zod_1.z.coerce.number().int().nonnegative().optional(),
    exactDate: date_field_1.dataFieldCellValueSchema.optional(),
    exactDateEnd: date_field_1.dataFieldCellValueSchema.optional(),
    timeZone: time_zone_1.timeZoneStringSchema,
})
    .superRefine((val, ctx) => {
    if (['exactDate', 'exactFormatDate'].includes(val.mode) && !val.exactDate) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `When the mode is set to '${val.mode}', an '${val.mode}' must be provided`,
        });
    }
    else if (val.mode === 'dateRange') {
        if (!val.exactDate) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: `When the mode is 'dateRange', a start date 'exactDate' must be provided`,
            });
        }
        if (!val.exactDateEnd) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: `When the mode is 'dateRange', an end date 'exactDateEnd' must be provided`,
            });
        }
    }
    else if (exports.modesRequiringDays.includes(val.mode) && val.numberOfDays == null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `When the mode is '${val.mode}', a numerical value for '${val.mode}' must be provided`,
        });
    }
});
exports.literalValueSchema = zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean()]);
exports.literalValueListSchema = exports.literalValueSchema.array().nonempty();
exports.fieldReferenceValueSchema = zod_1.z.object({
    type: zod_1.z.literal('field'),
    fieldId: zod_1.z.string(),
    tableId: zod_1.z.string().optional(),
});
exports.filterValueSchema = zod_1.z
    .union([exports.literalValueSchema, exports.literalValueListSchema, exports.dateFilterSchema, exports.fieldReferenceValueSchema])
    .nullable();
const isFieldReferenceValue = (value) => {
    return (typeof value === 'object' &&
        value !== null &&
        'type' in value &&
        value.type === 'field' &&
        typeof value.fieldId === 'string');
};
exports.isFieldReferenceValue = isFieldReferenceValue;
const operatorsExpectingNull = [operator_1.isEmpty.value, operator_1.isNotEmpty.value];
const operatorsExpectingArray = [
    operator_1.isAnyOf.value,
    operator_1.isNoneOf.value,
    operator_1.hasAnyOf.value,
    operator_1.hasAllOf.value,
    operator_1.isNotExactly.value,
    operator_1.hasNoneOf.value,
    operator_1.isExactly.value,
];
const normalizeUnaryOperatorValue = (input) => {
    if (input == null || typeof input !== 'object')
        return input;
    const value = input;
    if (typeof value.operator !== 'string' || !operatorsExpectingNull.includes(value.operator)) {
        return input;
    }
    if (Object.prototype.hasOwnProperty.call(value, 'value'))
        return input;
    return {
        ...value,
        value: null,
    };
};
exports.baseFilterOperatorSchema = zod_1.z.preprocess(normalizeUnaryOperatorValue, zod_1.z.object({
    isSymbol: zod_1.z.literal(false).optional(),
    fieldId: zod_1.z.string(),
    value: exports.filterValueSchema,
    operator: operator_1.operators,
}));
const filterOperatorRefineBase = zod_1.z.object({
    value: exports.filterValueSchema,
    operator: operator_1.operators,
});
const refineExtendedFilterOperatorSchema = (schema) => schema.superRefine((val, ctx) => {
    if (!val.value) {
        return zod_1.z.NEVER;
    }
    if (operatorsExpectingNull.includes(val.operator)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `For the operator '${val.operator}', the 'value' should be null`,
        });
    }
    if (operatorsExpectingArray.includes(val.operator) &&
        !Array.isArray(val.value) &&
        !(0, exports.isFieldReferenceValue)(val.value)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `For the operator '${val.operator}', the 'value' should be an array`,
        });
    }
    if (!operatorsExpectingArray.includes(val.operator) &&
        Array.isArray(val.value) &&
        !(0, exports.isFieldReferenceValue)(val.value)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `For the operator '${val.operator}', the 'value' should not be an array`,
        });
    }
});
exports.refineExtendedFilterOperatorSchema = refineExtendedFilterOperatorSchema;
exports.filterOperatorSchema = (0, exports.refineExtendedFilterOperatorSchema)(exports.baseFilterOperatorSchema);
exports.filterSymbolOperatorSchema = zod_1.z.object({
    isSymbol: zod_1.z.literal(true),
    fieldId: zod_1.z.string(),
    value: exports.filterValueSchema,
    operator: operator_1.symbols,
});
exports.filterItemSchema = zod_1.z.union([exports.filterOperatorSchema, exports.filterSymbolOperatorSchema]);
