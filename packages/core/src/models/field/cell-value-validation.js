"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDateFieldValueLoose = exports.validateCellValue = void 0;
const zod_1 = require("zod");
const asserts_1 = require("../../asserts");
const constant_1 = require("./constant");
const derivate_1 = require("./derivate");
const validateWithSchema = (schema, value) => {
    return zod_1.z
        .union([zod_1.z.array(schema).nonempty(), schema])
        .nullable()
        .safeParse(value);
};
const validateCellValue = (field, cellValue) => {
    const { type, cellValueType } = field;
    switch (type) {
        case constant_1.FieldType.LongText:
        case constant_1.FieldType.SingleLineText:
        case constant_1.FieldType.SingleSelect:
        case constant_1.FieldType.MultipleSelect:
            return validateWithSchema(derivate_1.singleLineTextCelValueSchema, cellValue);
        case constant_1.FieldType.Number:
            return validateWithSchema(derivate_1.numberCellValueSchema, cellValue);
        case constant_1.FieldType.Rating:
        case constant_1.FieldType.AutoNumber:
            return validateWithSchema(derivate_1.autoNumberCellValueSchema, cellValue);
        case constant_1.FieldType.Attachment:
            return derivate_1.attachmentCellValueSchema.nonempty().nullable().safeParse(cellValue);
        case constant_1.FieldType.Date:
        case constant_1.FieldType.CreatedTime:
        case constant_1.FieldType.LastModifiedTime:
            return validateWithSchema(derivate_1.dataFieldCellValueSchema, cellValue);
        case constant_1.FieldType.Checkbox:
            return validateWithSchema(zod_1.z.literal(true), cellValue);
        case constant_1.FieldType.Link:
            return validateWithSchema(derivate_1.linkCellValueSchema, cellValue);
        case constant_1.FieldType.User:
        case constant_1.FieldType.CreatedBy:
        case constant_1.FieldType.LastModifiedBy:
            return validateWithSchema(derivate_1.userCellValueSchema, cellValue);
        case constant_1.FieldType.Rollup:
        case constant_1.FieldType.ConditionalRollup:
        case constant_1.FieldType.Formula: {
            const schema = (0, derivate_1.getFormulaCellValueSchema)(cellValueType);
            return validateWithSchema(schema, cellValue);
        }
        case constant_1.FieldType.Button:
            return validateWithSchema(derivate_1.buttonFieldCelValueSchema, cellValue);
        case constant_1.FieldType.Ai:
            return validateWithSchema(derivate_1.singleLineTextCelValueSchema, cellValue);
        default:
            (0, asserts_1.assertNever)(type);
    }
};
exports.validateCellValue = validateCellValue;
const validateDateFieldValueLoose = (cellValue, isMultipleCellValue) => {
    if (isMultipleCellValue) {
        return zod_1.z.array(zod_1.z.string()).nonempty().nullable().safeParse(cellValue);
    }
    return zod_1.z.string().nullable().safeParse(cellValue);
};
exports.validateDateFieldValueLoose = validateDateFieldValueLoose;
