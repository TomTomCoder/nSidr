"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.numberFieldOptionsRoSchema = exports.numberFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
const formatting_1 = require("../formatting");
const show_as_1 = require("../show-as");
exports.numberFieldOptionsSchema = zod_1.z.object({
    formatting: formatting_1.numberFormattingSchema,
    showAs: show_as_1.numberShowAsSchema.optional(),
    defaultValue: zod_1.z.number().optional().nullable(),
});
exports.numberFieldOptionsRoSchema = exports.numberFieldOptionsSchema.partial({
    formatting: true,
    showAs: true,
});
