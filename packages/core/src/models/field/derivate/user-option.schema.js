"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
const userIdSchema = zod_1.z
    .string()
    .startsWith('usr')
    .or(zod_1.z.enum(['me']));
exports.userFieldOptionsSchema = zod_1.z.object({
    isMultiple: zod_1.z.boolean().optional().meta({
        description: 'Allow adding multiple users',
    }),
    shouldNotify: zod_1.z.boolean().optional().meta({
        description: 'Notify users when their name is added to a cell',
    }),
    defaultValue: zod_1.z
        .union([userIdSchema, zod_1.z.array(userIdSchema)])
        .optional()
        .nullable(),
});
