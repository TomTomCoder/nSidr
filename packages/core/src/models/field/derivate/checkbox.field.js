"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckboxFieldCore = exports.booleanCellValueSchema = void 0;
const zod_1 = require("zod");
const field_1 = require("../field");
const checkbox_option_schema_1 = require("./checkbox-option.schema");
exports.booleanCellValueSchema = zod_1.z.boolean();
class CheckboxFieldCore extends field_1.FieldCore {
    type;
    options;
    meta;
    cellValueType;
    static defaultOptions() {
        return {};
    }
    cellValue2String(cellValue) {
        if (cellValue == null) {
            return '';
        }
        if (this.isMultipleCellValue && Array.isArray(cellValue)) {
            return cellValue.map(String).join(', ');
        }
        return String(cellValue);
    }
    convertStringToCellValue(value) {
        if (this.isLookup) {
            return null;
        }
        return value ? true : null;
    }
    // eslint-disable-next-line sonarjs/no-identical-functions
    repair(value) {
        if (this.isLookup) {
            return null;
        }
        if (typeof value === 'string') {
            const lowercase = value.toLowerCase();
            if (lowercase === 'true') {
                return true;
            }
            if (lowercase === 'false') {
                return null;
            }
        }
        return value ? true : null;
    }
    item2String(item) {
        return item ? 'true' : '';
    }
    validateOptions() {
        return checkbox_option_schema_1.checkboxFieldOptionsSchema.safeParse(this.options);
    }
    // checkbox value only allow true or null, false should be convert to null
    validateCellValue(value) {
        if (this.isMultipleCellValue) {
            return zod_1.z.array(zod_1.z.literal(true)).nonempty().nullable().safeParse(value);
        }
        return zod_1.z
            .boolean()
            .nullable()
            .transform((val) => (val === false ? null : val))
            .safeParse(value);
    }
    accept(visitor) {
        return visitor.visitCheckboxField(this);
    }
}
exports.CheckboxFieldCore = CheckboxFieldCore;
