"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbFieldType = void 0;
const ts_pattern_1 = require("ts-pattern");
const constant_1 = require("../constant");
/**
 * Get database field type based on field type, cell value type, and multiplicity
 * This is a pure function that doesn't depend on any services
 */
function getDbFieldType(fieldType, cellValueType, isMultipleCellValue) {
    // Multiple cell values are always stored as JSON
    if (isMultipleCellValue) {
        return constant_1.DbFieldType.Json;
    }
    return (0, ts_pattern_1.match)(fieldType)
        .with(constant_1.FieldType.Link, constant_1.FieldType.User, constant_1.FieldType.Attachment, constant_1.FieldType.Button, constant_1.FieldType.CreatedBy, constant_1.FieldType.LastModifiedBy, () => constant_1.DbFieldType.Json)
        .with(constant_1.FieldType.AutoNumber, () => constant_1.DbFieldType.Integer)
        .otherwise(() => (0, ts_pattern_1.match)(cellValueType)
        .with(constant_1.CellValueType.Number, () => constant_1.DbFieldType.Real)
        .with(constant_1.CellValueType.DateTime, () => constant_1.DbFieldType.DateTime)
        .with(constant_1.CellValueType.Boolean, () => constant_1.DbFieldType.Boolean)
        .with(constant_1.CellValueType.String, () => constant_1.DbFieldType.Text)
        .exhaustive());
}
exports.getDbFieldType = getDbFieldType;
