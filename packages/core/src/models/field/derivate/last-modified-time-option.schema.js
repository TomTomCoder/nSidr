"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lastModifiedTimeFieldOptionsRoSchema = exports.lastModifiedTimeFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
const formatting_1 = require("../formatting");
exports.lastModifiedTimeFieldOptionsSchema = zod_1.z
    .object({
    expression: zod_1.z.literal('LAST_MODIFIED_TIME()').default('LAST_MODIFIED_TIME()'),
    formatting: formatting_1.datetimeFormattingSchema.optional(),
    trackedFieldIds: zod_1.z.array(zod_1.z.string()).optional(),
})
    .passthrough();
exports.lastModifiedTimeFieldOptionsRoSchema = exports.lastModifiedTimeFieldOptionsSchema;
