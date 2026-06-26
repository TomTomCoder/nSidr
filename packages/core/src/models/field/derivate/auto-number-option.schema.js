"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoNumberFieldOptionsRoSchema = exports.autoNumberFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
exports.autoNumberFieldOptionsSchema = zod_1.z.object({
    expression: zod_1.z.literal('AUTO_NUMBER()'),
});
exports.autoNumberFieldOptionsRoSchema = exports.autoNumberFieldOptionsSchema.omit({
    expression: true,
});
