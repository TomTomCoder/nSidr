"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
const formatting_1 = require("../formatting");
exports.dateFieldOptionsSchema = zod_1.z.object({
    formatting: formatting_1.datetimeFormattingSchema,
    defaultValue: zod_1.z
        .enum(['now'])
        .optional()
        .nullable()
        .meta({
        description: 'Whether the new row is automatically filled with the current time, caveat: the defaultValue is just a flag, it dose not effect the storing value of the record',
    }),
});
