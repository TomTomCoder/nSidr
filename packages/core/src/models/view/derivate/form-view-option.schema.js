"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formViewOptionSchema = void 0;
const zod_1 = require("../../../zod");
exports.formViewOptionSchema = zod_1.z
    .object({
    coverUrl: zod_1.z.string().optional().meta({ description: 'The cover url of the form' }),
    logoUrl: zod_1.z.string().optional().meta({ description: 'The logo url of the form' }),
    submitLabel: zod_1.z.string().optional().meta({ description: 'The submit button text of the form' }),
})
    .strict();
