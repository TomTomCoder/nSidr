"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.longTextFieldOptionsSchema = exports.longTextShowAsSchema = void 0;
const zod_1 = require("../../../zod");
exports.longTextShowAsSchema = zod_1.z.object({
    type: zod_1.z.literal('markdown'),
});
exports.longTextFieldOptionsSchema = zod_1.z.object({
    showAs: exports.longTextShowAsSchema.optional().nullable(),
    defaultValue: zod_1.z
        .string()
        .optional()
        .transform((value) => (typeof value === 'string' ? value.trim() : value))
        .optional()
        .nullable(),
});
