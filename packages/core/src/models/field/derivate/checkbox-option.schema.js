"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkboxFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
exports.checkboxFieldOptionsSchema = zod_1.z
    .object({ defaultValue: zod_1.z.boolean().optional().nullable() })
    .strict();
