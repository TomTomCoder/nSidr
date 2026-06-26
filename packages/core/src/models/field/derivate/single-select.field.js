"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleSelectFieldCore = exports.singleSelectCelValueSchema = void 0;
const zod_1 = require("zod");
const select_field_abstract_1 = require("./abstract/select.field.abstract");
exports.singleSelectCelValueSchema = zod_1.z.string();
class SingleSelectFieldCore extends select_field_abstract_1.SelectFieldCore {
    type;
    cellValueType;
    convertStringToCellValue(value, shouldExtend) {
        if (this.isLookup) {
            return null;
        }
        if (value === '' || value == null) {
            return null;
        }
        const cellValue = String(value).replace(/\n|\r/g, ' ').trim();
        if (shouldExtend) {
            return cellValue;
        }
        if (this.options.choices.find((c) => c.name === cellValue)) {
            return cellValue;
        }
        return null;
    }
    repair(value) {
        if (this.isLookup) {
            return null;
        }
        if (Array.isArray(value)) {
            const firstValidValue = value.find((item) => typeof item === 'string');
            return firstValidValue == null ? null : this.convertStringToCellValue(firstValidValue);
        }
        if (typeof value === 'string') {
            return this.convertStringToCellValue(value);
        }
        return null;
    }
    accept(visitor) {
        return visitor.visitSingleSelectField(this);
    }
}
exports.SingleSelectFieldCore = SingleSelectFieldCore;
