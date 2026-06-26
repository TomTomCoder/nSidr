"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipleSelectFieldCore = exports.multipleSelectCelValueSchema = void 0;
const zod_1 = require("zod");
const select_field_abstract_1 = require("./abstract/select.field.abstract");
exports.multipleSelectCelValueSchema = zod_1.z.array(zod_1.z.string());
class MultipleSelectFieldCore extends select_field_abstract_1.SelectFieldCore {
    type;
    cellValueType;
    isMultipleCellValue = true;
    convertStringToCellValue(value, shouldExtend) {
        if (value == null) {
            return null;
        }
        let cellValue = value.split(/[\n\r,]\s?(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((item) => {
            return item.includes(',') ? item.slice(1, -1).trim() : item.trim();
        });
        cellValue = shouldExtend
            ? cellValue
            : cellValue.filter((value) => this.options.choices.find((c) => c.name === value));
        return cellValue.length === 0 ? null : cellValue;
    }
    repair(value) {
        if (Array.isArray(value)) {
            const cellValue = value.filter((value) => this.options.choices.find((c) => c.name === value));
            if (cellValue.length === 0) {
                return null;
            }
            return cellValue;
        }
        if (typeof value === 'string') {
            return this.convertStringToCellValue(value);
        }
        throw new Error(`invalid value: ${value} for field: ${this.name}`);
    }
    accept(visitor) {
        return visitor.visitMultipleSelectField(this);
    }
}
exports.MultipleSelectFieldCore = MultipleSelectFieldCore;
