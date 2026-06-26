"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createdTimeFieldOptionsRoSchema = exports.createdTimeFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
const formatting_1 = require("../formatting");
exports.createdTimeFieldOptionsSchema = zod_1.z.object({
    expression: zod_1.z.literal('CREATED_TIME()'),
    formatting: formatting_1.datetimeFormattingSchema,
});
exports.createdTimeFieldOptionsRoSchema = exports.createdTimeFieldOptionsSchema.omit({
    expression: true,
});
