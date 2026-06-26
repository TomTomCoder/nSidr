"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarViewOptionSchema = exports.colorConfigSchema = exports.ColorConfigType = void 0;
const zod_1 = require("../../../zod");
const colors_1 = require("../../field/colors");
var ColorConfigType;
(function (ColorConfigType) {
    ColorConfigType["Field"] = "field";
    ColorConfigType["Custom"] = "custom";
})(ColorConfigType || (exports.ColorConfigType = ColorConfigType = {}));
exports.colorConfigSchema = zod_1.z
    .object({
    type: zod_1.z.enum(ColorConfigType),
    fieldId: zod_1.z.string().optional().nullable().meta({
        description: 'The color field id.',
    }),
    color: zod_1.z.enum(colors_1.Colors).optional().nullable().meta({
        description: 'The color.',
    }),
})
    .optional()
    .nullable();
exports.calendarViewOptionSchema = zod_1.z
    .object({
    startDateFieldId: zod_1.z.string().optional().nullable().meta({
        description: 'The start date field id.',
    }),
    endDateFieldId: zod_1.z.string().optional().nullable().meta({
        description: 'The end date field id.',
    }),
    titleFieldId: zod_1.z.string().optional().nullable().meta({
        description: 'The title field id.',
    }),
    colorConfig: exports.colorConfigSchema,
})
    .strict();
