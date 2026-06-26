"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectFieldOptionsRoSchema = exports.selectFieldOptionsSchema = exports.selectFieldChoiceRoSchema = exports.selectFieldChoiceSchema = void 0;
const zod_1 = require("../../../../zod");
// Select field options (for single and multiple select)
exports.selectFieldChoiceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    color: zod_1.z.string(),
});
exports.selectFieldChoiceRoSchema = exports.selectFieldChoiceSchema.partial({ id: true, color: true });
exports.selectFieldOptionsSchema = zod_1.z.object({
    choices: zod_1.z.array(exports.selectFieldChoiceSchema),
    defaultValue: zod_1.z
        .union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())])
        .optional()
        .nullable(),
    preventAutoNewOptions: zod_1.z.boolean().optional(),
});
exports.selectFieldOptionsRoSchema = zod_1.z.object({
    choices: zod_1.z.array(exports.selectFieldChoiceRoSchema),
    // null is used to explicitly clear the default value (since undefined is stripped during JSON serialization)
    defaultValue: zod_1.z
        .union([zod_1.z.string(), zod_1.z.array(zod_1.z.string())])
        .optional()
        .nullable(),
    preventAutoNewOptions: zod_1.z.boolean().optional(),
});
