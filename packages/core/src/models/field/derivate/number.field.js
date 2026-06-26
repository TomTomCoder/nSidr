"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberFieldCore = exports.numberCellValueSchema = void 0;
const zod_1 = require("zod");
const field_1 = require("../field");
const formatting_1 = require("../formatting");
const show_as_1 = require("../show-as");
exports.numberCellValueSchema = zod_1.z.number();
class NumberFieldCore extends field_1.FieldCore {
    type;
    options;
    meta;
    cellValueType;
    static defaultOptions() {
        return {
            formatting: formatting_1.defaultNumberFormatting,
        };
    }
    cellValue2String(cellValue) {
        if (cellValue == null) {
            return '';
        }
        if (this.isMultipleCellValue && Array.isArray(cellValue)) {
            return cellValue.map((v) => this.item2String(v)).join(', ');
        }
        return this.item2String(cellValue);
    }
    item2String(value) {
        return (0, formatting_1.formatNumberToString)(value, this.options.formatting);
    }
    convertStringToCellValue(value) {
        if (this.isLookup) {
            return null;
        }
        return (0, formatting_1.parseStringToNumber)(value, this.options.formatting);
    }
    repair(value) {
        if (this.isLookup) {
            return null;
        }
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            return this.convertStringToCellValue(value);
        }
        return null;
    }
    validateOptions() {
        return zod_1.z
            .object({
            formatting: formatting_1.numberFormattingSchema,
            showAs: (0, show_as_1.getShowAsSchema)(this.cellValueType, this.isMultipleCellValue),
        })
            .safeParse(this.options);
    }
    validateCellValue(value) {
        if (this.isMultipleCellValue) {
            return zod_1.z.array(exports.numberCellValueSchema).nonempty().nullable().safeParse(value);
        }
        return exports.numberCellValueSchema.nullable().safeParse(value);
    }
    accept(visitor) {
        return visitor.visitNumberField(this);
    }
}
exports.NumberFieldCore = NumberFieldCore;
