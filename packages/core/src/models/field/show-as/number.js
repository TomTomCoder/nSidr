"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.numberShowAsSchema = exports.multiNumberShowAsSchema = exports.singleNumberShowAsSchema = exports.MultiNumberDisplayType = exports.SingleNumberDisplayType = void 0;
const zod_1 = require("zod");
const colors_1 = require("../colors");
var SingleNumberDisplayType;
(function (SingleNumberDisplayType) {
    SingleNumberDisplayType["Bar"] = "bar";
    SingleNumberDisplayType["Ring"] = "ring";
})(SingleNumberDisplayType || (exports.SingleNumberDisplayType = SingleNumberDisplayType = {}));
var MultiNumberDisplayType;
(function (MultiNumberDisplayType) {
    MultiNumberDisplayType["Bar"] = "bar";
    MultiNumberDisplayType["Line"] = "line";
})(MultiNumberDisplayType || (exports.MultiNumberDisplayType = MultiNumberDisplayType = {}));
exports.singleNumberShowAsSchema = zod_1.z
    .object({
    type: zod_1.z.enum(SingleNumberDisplayType).meta({
        description: 'can display as bar or ring in number field with single cellValue value',
    }),
    color: zod_1.z.enum(colors_1.Colors),
    showValue: zod_1.z.boolean().meta({
        description: 'whether to displays the specific value on the graph',
    }),
    maxValue: zod_1.z.number().meta({
        description: 'the value that represents a 100% maximum value, it does not represent a hard limit on the value',
    }),
})
    .describe('Only be used in number related field with isMultipleCellValue is not true');
exports.multiNumberShowAsSchema = zod_1.z
    .object({
    type: zod_1.z.enum(MultiNumberDisplayType).meta({
        description: 'can display as bar or line in number field with multiple cellValue value',
    }),
    color: zod_1.z.enum(colors_1.Colors),
})
    .describe('Only be used in number related field with isMultipleCellValue is true');
exports.numberShowAsSchema = zod_1.z
    .union([exports.singleNumberShowAsSchema.strict(), exports.multiNumberShowAsSchema.strict()])
    .describe('Only be used in number field (number field or formula / rollup field with cellValueType equals Number');
