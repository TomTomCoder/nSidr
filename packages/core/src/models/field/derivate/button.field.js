"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonFieldCore = exports.buttonFieldCelValueSchema = void 0;
const zod_1 = require("zod");
const colors_1 = require("../colors");
const field_1 = require("../field");
const button_option_schema_1 = require("./button-option.schema");
exports.buttonFieldCelValueSchema = zod_1.z.object({
    count: zod_1.z.number().int().meta({ description: 'clicked count' }),
});
class ButtonFieldCore extends field_1.FieldCore {
    type;
    options;
    meta;
    cellValueType;
    static defaultOptions() {
        return {
            label: 'Button',
            color: colors_1.Colors.Teal,
        };
    }
    cellValue2String(_cellValue) {
        return '';
    }
    item2String(_value) {
        return '';
    }
    convertStringToCellValue(_value) {
        return null;
    }
    repair(_value) {
        return null;
    }
    validateOptions() {
        return button_option_schema_1.buttonFieldOptionsSchema.safeParse(this.options);
    }
    validateCellValue(value) {
        if (this.isMultipleCellValue) {
            return zod_1.z.array(exports.buttonFieldCelValueSchema).nonempty().nullable().safeParse(value);
        }
        return exports.buttonFieldCelValueSchema.nullable().safeParse(value);
    }
    accept(visitor) {
        return visitor.visitButtonField(this);
    }
}
exports.ButtonFieldCore = ButtonFieldCore;
