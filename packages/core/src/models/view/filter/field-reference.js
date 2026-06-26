"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFieldReferenceOperatorSupported = exports.getFieldReferenceSupportedOperators = exports.isFieldReferenceComparable = exports.getFieldReferenceComparisonKind = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const constant_1 = require("../../field/constant");
const operator_1 = require("./operator");
const USER_FIELD_TYPES = new Set([
    constant_1.FieldType.User,
    constant_1.FieldType.CreatedBy,
    constant_1.FieldType.LastModifiedBy,
]);
const LINK_FIELD_TYPES = new Set([constant_1.FieldType.Link]);
const ATTACHMENT_FIELD_TYPES = new Set([constant_1.FieldType.Attachment]);
function getFieldReferenceComparisonKind(field) {
    if (USER_FIELD_TYPES.has(field.type)) {
        return 'user';
    }
    if (LINK_FIELD_TYPES.has(field.type)) {
        return 'link';
    }
    if (ATTACHMENT_FIELD_TYPES.has(field.type)) {
        return 'attachment';
    }
    switch (field.cellValueType) {
        case constant_1.CellValueType.Number:
            return 'number';
        case constant_1.CellValueType.Boolean:
            return 'boolean';
        case constant_1.CellValueType.DateTime:
            return 'dateTime';
        case constant_1.CellValueType.String:
        default:
            return 'string';
    }
}
exports.getFieldReferenceComparisonKind = getFieldReferenceComparisonKind;
function isFieldReferenceComparable(field, reference) {
    return getFieldReferenceComparisonKind(field) === getFieldReferenceComparisonKind(reference);
}
exports.isFieldReferenceComparable = isFieldReferenceComparable;
const FIELD_REFERENCE_UNSUPPORTED_OPERATORS = new Set([operator_1.isEmpty.value, operator_1.isNotEmpty.value]);
function getFieldReferenceSupportedOperators(field) {
    const validOperators = (0, operator_1.getValidFilterOperators)(field);
    return validOperators.filter((op) => !FIELD_REFERENCE_UNSUPPORTED_OPERATORS.has(op));
}
exports.getFieldReferenceSupportedOperators = getFieldReferenceSupportedOperators;
function isFieldReferenceOperatorSupported(field, operator) {
    if (!operator) {
        return false;
    }
    if (FIELD_REFERENCE_UNSUPPORTED_OPERATORS.has(operator)) {
        return false;
    }
    const validOperators = (0, operator_1.getValidFilterOperators)(field);
    return validOperators.includes(operator);
}
exports.isFieldReferenceOperatorSupported = isFieldReferenceOperatorSupported;
