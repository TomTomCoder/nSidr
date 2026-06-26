"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFilterValidationIssues = exports.extractFieldIdsFromFilter = exports.mergeFilter = exports.mergeWithDefaultFilter = exports.filterStringSchema = exports.filterRoSchema = exports.filterSchema = exports.FILTER_DESCRIPTION = exports.nestedFilterItemSchema = exports.baseFilterSetSchema = void 0;
const zod_1 = require("zod");
const conjunction_1 = require("./conjunction");
const filter_item_1 = require("./filter-item");
const operator_1 = require("./operator");
exports.baseFilterSetSchema = zod_1.z.object({
    conjunction: conjunction_1.conjunctionSchema,
});
exports.nestedFilterItemSchema = exports.baseFilterSetSchema.extend({
    filterSet: zod_1.z.lazy(() => zod_1.z.union([filter_item_1.filterItemSchema, exports.nestedFilterItemSchema]).array()),
});
exports.FILTER_DESCRIPTION = 'A filter object for complex query conditions based on fields, operators, and values. Use our visual query builder at https://app.teable.ai/developer/tool/query-builder to build filters.';
exports.filterSchema = exports.nestedFilterItemSchema.nullable().meta({
    type: 'object',
    description: exports.FILTER_DESCRIPTION,
});
exports.filterRoSchema = zod_1.z.object({
    filter: exports.filterSchema,
});
exports.filterStringSchema = zod_1.z.string().transform((val, ctx) => {
    let jsonValue;
    try {
        jsonValue = JSON.parse(val);
    }
    catch {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Invalid JSON string',
        });
        return zod_1.z.NEVER;
    }
    return exports.filterSchema.parse(jsonValue);
});
function mergeWithDefaultFilter(defaultViewFilter, queryFilter) {
    if (!defaultViewFilter && !queryFilter) {
        return undefined;
    }
    const parseFilter = exports.filterStringSchema.safeParse(defaultViewFilter);
    const viewFilter = parseFilter.success ? parseFilter.data : undefined;
    let mergeFilter = viewFilter;
    if (queryFilter) {
        if (viewFilter) {
            mergeFilter = {
                filterSet: [{ filterSet: [viewFilter, queryFilter], conjunction: 'and' }],
                conjunction: 'and',
            };
        }
        else {
            mergeFilter = queryFilter;
        }
    }
    return mergeFilter;
}
exports.mergeWithDefaultFilter = mergeWithDefaultFilter;
const mergeFilter = (filter1, filter2, conjunction = conjunction_1.and.value) => {
    const finalFilter1 = filter1;
    const finalFilter2 = filter2;
    if (!finalFilter1 && !finalFilter2)
        return;
    if (!finalFilter1)
        return finalFilter2;
    if (!finalFilter2)
        return finalFilter1;
    return {
        filterSet: [{ filterSet: [finalFilter1, finalFilter2], conjunction }],
        conjunction,
    };
};
exports.mergeFilter = mergeFilter;
const extractFieldIdsFromFilter = (filter, includeValueFieldIds = false) => {
    if (!filter)
        return [];
    const fieldIds = [];
    // eslint-disable-next-line sonarjs/cognitive-complexity
    const traverse = (filterItem) => {
        if (filterItem && 'fieldId' in filterItem) {
            fieldIds.push(filterItem.fieldId);
            if (includeValueFieldIds) {
                const value = filterItem.value;
                if ((0, filter_item_1.isFieldReferenceValue)(value)) {
                    fieldIds.push(value.fieldId);
                }
                else if (Array.isArray(value)) {
                    for (const entry of value) {
                        if ((0, filter_item_1.isFieldReferenceValue)(entry)) {
                            fieldIds.push(entry.fieldId);
                        }
                    }
                }
            }
        }
        else if (filterItem && 'filterSet' in filterItem) {
            filterItem.filterSet.forEach((item) => traverse(item));
        }
    };
    traverse(filter);
    return [...new Set(fieldIds)];
};
exports.extractFieldIdsFromFilter = extractFieldIdsFromFilter;
const normalizeFilterOperator = (operator, isSymbol, fieldMeta) => {
    if (!isSymbol) {
        return operator;
    }
    const operatorMapping = (0, operator_1.getFilterOperatorMapping)(fieldMeta);
    return (Object.entries(operatorMapping).find(([, symbol]) => symbol === operator)?.[0] ??
        undefined);
};
const analyzeFilterItemValidationIssues = (filterItem, path, fieldMetaMap) => {
    const { fieldId, operator, value, isSymbol } = filterItem;
    const fieldMeta = fieldMetaMap[fieldId];
    if (!fieldMeta) {
        return [
            {
                code: 'FIELD_NOT_FOUND',
                path,
                fieldId,
                operator,
                message: `The field '${fieldId}' was not found and this filter condition will be ignored.`,
            },
        ];
    }
    const normalizedOperator = normalizeFilterOperator(operator, isSymbol, fieldMeta);
    const validFilterOperators = (0, operator_1.getValidFilterOperators)(fieldMeta);
    if (!normalizedOperator || !validFilterOperators.includes(normalizedOperator)) {
        return [
            {
                code: 'OPERATOR_NOT_ALLOWED',
                path,
                fieldId,
                operator,
                message: `The '${operator}' operation provided for '${fieldId}' is invalid. Allowed operators: [${validFilterOperators.join(',')}].`,
            },
        ];
    }
    const validFilterSubOperators = (0, operator_1.getValidFilterSubOperators)(fieldMeta.type, normalizedOperator);
    // Operator without sub-operators (isEmpty / isNotEmpty / ...) has no mode to check.
    if (!validFilterSubOperators)
        return [];
    // null/undefined is treated as "in-progress" — backend drops these silently.
    if (value == null)
        return [];
    // Date operators support comparing against another field directly.
    if ((0, filter_item_1.isFieldReferenceValue)(value))
        return [];
    const operatorName = normalizedOperator === operator_1.isWithIn.value ? 'isWithIn' : normalizedOperator;
    // Shape mismatch: operator expects { mode, ... } but value is a primitive/array.
    if (typeof value !== 'object' || Array.isArray(value) || !('mode' in value)) {
        return [
            {
                code: 'VALUE_SHAPE_INVALID',
                path,
                fieldId,
                operator: normalizedOperator,
                message: `The '${operatorName}' operation requires an object value with a 'mode' field. Valid modes: [${validFilterSubOperators.join(',')}]. Example: { mode: "${validFilterSubOperators[0]}", timeZone: "UTC" }`,
            },
        ];
    }
    const mode = String(value.mode);
    if (!validFilterSubOperators.includes(mode)) {
        return [
            {
                code: 'MODE_NOT_ALLOWED',
                path,
                fieldId,
                operator: normalizedOperator,
                mode,
                message: `The '${operatorName}' operation with mode '${mode}' is invalid. Allowed modes: [${validFilterSubOperators.join(',')}].`,
            },
        ];
    }
    return [];
};
const analyzeFilterValidationIssues = (filter, fieldMetaMap) => {
    if (!filter)
        return [];
    const errors = [];
    const traverse = (filterItem, path) => {
        if (filterItem && 'fieldId' in filterItem) {
            errors.push(...analyzeFilterItemValidationIssues(filterItem, path, fieldMetaMap));
            return;
        }
        if (filterItem && 'filterSet' in filterItem) {
            filterItem.filterSet.forEach((item, index) => traverse(item, [...path, index]));
        }
    };
    traverse(filter, []);
    return errors;
};
exports.analyzeFilterValidationIssues = analyzeFilterValidationIssues;
