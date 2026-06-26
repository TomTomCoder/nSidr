"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.singlelineTextFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
const show_as_1 = require("../show-as");
exports.singlelineTextFieldOptionsSchema = zod_1.z.object({
    showAs: show_as_1.singleLineTextShowAsSchema.optional(),
    defaultValue: zod_1.z
        .string()
        .transform((value) => (typeof value === 'string' ? value.trim() : value))
        .optional()
        .nullable(),
});
