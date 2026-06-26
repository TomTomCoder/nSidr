"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectFieldCore = exports.selectFieldOptionsRoSchema = exports.selectFieldOptionsSchema = exports.selectFieldChoiceRoSchema = exports.selectFieldChoiceSchema = void 0;
const lodash_1 = require("lodash");
const zod_1 = require("zod");
const colors_1 = require("../../colors");
const field_1 = require("../../field");
exports.selectFieldChoiceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z
        .string()
        .transform((s) => s.trim())
        .pipe(zod_1.z.string().min(1)),
    color: zod_1.z.enum(colors_1.Colors),
});
exports.selectFieldChoiceRoSchema = exports.selectFieldChoiceSchema.partial({ id: true, color: true });
exports.selectFieldOptionsSchema = zod_1.z.object({
    choices: zod_1.z.array(exports.selectFieldChoiceSchema),
    defaultValue: zod_1.z.union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())]).optional(),
    preventAutoNewOptions: zod_1.z.boolean().optional(),
});
exports.selectFieldOptionsRoSchema = zod_1.z
    .object({
    choices: zod_1.z.array(exports.selectFieldChoiceRoSchema),
    defaultValue: zod_1.z
        .union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())])
        .optional()
        .nullable(),
    preventAutoNewOptions: zod_1.z.boolean().optional(),
})
    .describe('options for both single and multiple select fields');
class SelectFieldCore extends field_1.FieldCore {
    _innerChoicesMap = {};
    _innerChoicesMapKey = '';
    meta;
    static defaultOptions() {
        return {
            choices: [],
        };
    }
    options;
    // For validate cellValue,
    // avoiding choice and checking too many rows has a complexity of m(choice.length) x n(rows.length)
    get innerChoicesMap() {
        const choices = this.options?.choices ?? [];
        const choicesKey = JSON.stringify(choices.map(({ id, name }) => [id, name]));
        if (this._innerChoicesMapKey !== choicesKey) {
            this._innerChoicesMap = (0, lodash_1.keyBy)(choices, 'name');
            this._innerChoicesMapKey = choicesKey;
        }
        return this._innerChoicesMap;
    }
    validateOptions() {
        return exports.selectFieldOptionsSchema.safeParse(this.options);
    }
    cellValue2String(cellValue) {
        if (cellValue == null) {
            return '';
        }
        if (Array.isArray(cellValue)) {
            return cellValue.map((value) => this.item2String(value)).join(', ');
        }
        return cellValue;
    }
    item2String(value) {
        if (value == null) {
            return '';
        }
        const stringValue = String(value);
        if (this.isMultipleCellValue && stringValue.includes(',')) {
            return `"${stringValue}"`;
        }
        return stringValue;
    }
    validateCellValue(cellValue) {
        const nameSchema = zod_1.z.string().refine((value) => {
            return value == null || this.innerChoicesMap[value];
        }, { message: `${cellValue} is not one of the choice names` });
        if (this.isMultipleCellValue) {
            return zod_1.z.array(nameSchema).nonempty().nullable().safeParse(cellValue);
        }
        return nameSchema.nullable().safeParse(cellValue);
    }
}
exports.SelectFieldCore = SelectFieldCore;
