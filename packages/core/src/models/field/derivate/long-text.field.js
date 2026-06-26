"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LongTextFieldCore = exports.longTextCelValueSchema = void 0;
const zod_1 = require("zod");
const field_1 = require("../field");
const long_text_option_schema_1 = require("./long-text-option.schema");
exports.longTextCelValueSchema = zod_1.z.string();
class LongTextFieldCore extends field_1.FieldCore {
    type;
    options;
    meta;
    cellValueType;
    static defaultOptions() {
        return {};
    }
    cellValue2String(cellValue) {
        if (this.isMultipleCellValue && Array.isArray(cellValue)) {
            return cellValue.join(', ');
        }
        return cellValue ?? '';
    }
    item2String(value) {
        return value ? String(value) : '';
    }
    convertStringToCellValue(value) {
        if (this.isLookup) {
            return null;
        }
        if (value === '' || value == null) {
            return null;
        }
        return value.trim();
    }
    repair(value) {
        if (this.isLookup) {
            return null;
        }
        if (typeof value === 'string') {
            return this.convertStringToCellValue(value);
        }
        return String(value);
    }
    validateOptions() {
        return long_text_option_schema_1.longTextFieldOptionsSchema.safeParse(this.options);
    }
    validateCellValue(value) {
        if (this.isMultipleCellValue) {
            return zod_1.z.array(exports.longTextCelValueSchema).nonempty().nullable().safeParse(value);
        }
        return zod_1.z
            .string()
            .transform((val) => (val === '' ? null : val))
            .nullable()
            .safeParse(value);
    }
    accept(visitor) {
        return visitor.visitLongTextField(this);
    }
}
exports.LongTextFieldCore = LongTextFieldCore;
