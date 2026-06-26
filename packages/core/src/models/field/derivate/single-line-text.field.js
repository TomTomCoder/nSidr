"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleLineTextFieldCore = exports.singleLineTextCelValueSchema = void 0;
const zod_1 = require("zod");
const field_1 = require("../field");
const single_line_text_option_schema_1 = require("./single-line-text-option.schema");
exports.singleLineTextCelValueSchema = zod_1.z.string();
class SingleLineTextFieldCore extends field_1.FieldCore {
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
        // value may be the null
        // eslint-disable-next-line regexp/prefer-character-class
        const realValue = value?.replace(/[\n\r\t]/g, ' ')?.trim() ?? null;
        if (realValue === '' || realValue == null) {
            return null;
        }
        return realValue;
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
        return single_line_text_option_schema_1.singlelineTextFieldOptionsSchema.safeParse(this.options);
    }
    validateCellValue(value) {
        if (this.isMultipleCellValue) {
            return zod_1.z.array(exports.singleLineTextCelValueSchema).nonempty().nullable().safeParse(value);
        }
        return zod_1.z
            .string()
            .transform((val) => (val === '' ? null : val))
            .nullable()
            .safeParse(value);
    }
    accept(visitor) {
        return visitor.visitSingleLineTextField(this);
    }
}
exports.SingleLineTextFieldCore = SingleLineTextFieldCore;
