"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyFieldPropertyOps = exports.isFieldHasExpression = exports.isLinkField = exports.isFormulaField = void 0;
const constant_1 = require("./constant");
function isFormulaField(field) {
    return field.type === constant_1.FieldType.Formula;
}
exports.isFormulaField = isFormulaField;
function isLinkField(field) {
    return field.type === constant_1.FieldType.Link && !field.isLookup;
}
exports.isLinkField = isLinkField;
function isFieldHasExpression(field) {
    return (isFormulaField(field) ||
        field.type === constant_1.FieldType.AutoNumber ||
        field.type === constant_1.FieldType.LastModifiedTime ||
        field.type === constant_1.FieldType.CreatedTime);
}
exports.isFieldHasExpression = isFieldHasExpression;
/**
 * Apply a single field property operation to a field VO.
 * This is a helper function that handles type-safe property assignment.
 */
function applyFieldPropertyOperation(fieldVo, key, newValue) {
    switch (key) {
        case 'type':
            return { ...fieldVo, type: newValue };
        case 'name':
            return { ...fieldVo, name: newValue };
        case 'description':
            return { ...fieldVo, description: newValue };
        case 'options':
            return { ...fieldVo, options: newValue };
        case 'meta':
            return { ...fieldVo, meta: newValue };
        case 'aiConfig':
            return { ...fieldVo, aiConfig: newValue };
        case 'notNull':
            return { ...fieldVo, notNull: newValue };
        case 'unique':
            return { ...fieldVo, unique: newValue };
        case 'isPrimary':
            return { ...fieldVo, isPrimary: newValue };
        case 'isComputed':
            return { ...fieldVo, isComputed: newValue };
        case 'isPending':
            return { ...fieldVo, isPending: newValue };
        case 'hasError':
            return { ...fieldVo, hasError: newValue };
        case 'isLookup':
            return { ...fieldVo, isLookup: newValue };
        case 'isConditionalLookup':
            return { ...fieldVo, isConditionalLookup: newValue };
        case 'lookupOptions':
            return { ...fieldVo, lookupOptions: newValue };
        case 'cellValueType':
            return { ...fieldVo, cellValueType: newValue };
        case 'isMultipleCellValue':
            return { ...fieldVo, isMultipleCellValue: newValue };
        case 'dbFieldType':
            return { ...fieldVo, dbFieldType: newValue };
        case 'dbFieldName':
            return { ...fieldVo, dbFieldName: newValue };
        case 'recordRead':
            return { ...fieldVo, recordRead: newValue };
        case 'recordCreate':
            return { ...fieldVo, recordCreate: newValue };
        default:
            // For unsupported keys (like 'id' and 'type'), return the original fieldVo unchanged
            return fieldVo;
    }
}
/**
 * Apply field property operations to a field VO and return a new field VO.
 * This is a pure function that does not mutate the original field VO.
 *
 * @param fieldVo - The existing field VO to base the new field on
 * @param ops - Array of field property operations to apply
 * @returns A new field VO with the operations applied
 */
function applyFieldPropertyOps(fieldVo, ops) {
    // Always create a copy to ensure immutability, even with empty operations
    return ops.reduce((currentFieldVo, op) => applyFieldPropertyOperation(currentFieldVo, op.key, op.newValue), { ...fieldVo });
}
exports.applyFieldPropertyOps = applyFieldPropertyOps;
