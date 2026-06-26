"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoNumberFieldCore = exports.autoNumberCellValueSchema = void 0;
const zod_1 = require("zod");
const formula_field_abstract_1 = require("./abstract/formula.field.abstract");
const auto_number_option_schema_1 = require("./auto-number-option.schema");
exports.autoNumberCellValueSchema = zod_1.z.number().int();
class AutoNumberFieldCore extends formula_field_abstract_1.FormulaAbstractCore {
    type;
    static defaultOptions() {
        return {};
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
        if (value == null) {
            return '';
        }
        return String(value);
    }
    validateOptions() {
        console.log('this.options', this.options);
        return auto_number_option_schema_1.autoNumberFieldOptionsRoSchema.safeParse(this.options);
    }
    validateCellValue(value) {
        if (this.isMultipleCellValue) {
            return zod_1.z.array(exports.autoNumberCellValueSchema).nonempty().nullable().safeParse(value);
        }
        return exports.autoNumberCellValueSchema.nullable().safeParse(value);
    }
    getIsPersistedAsGeneratedColumn() {
        return this.meta?.persistedAsGeneratedColumn || false;
    }
    getExpression() {
        return this.options.expression;
    }
    accept(visitor) {
        return visitor.visitAutoNumberField(this);
    }
}
exports.AutoNumberFieldCore = AutoNumberFieldCore;
