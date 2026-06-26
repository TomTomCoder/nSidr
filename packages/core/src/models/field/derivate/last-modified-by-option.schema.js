"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lastModifiedByFieldOptionsSchema = void 0;
const zod_1 = require("../../../zod");
exports.lastModifiedByFieldOptionsSchema = zod_1.z
    .object({
    trackedFieldIds: zod_1.z.array(zod_1.z.string()).optional(),
})
    .strict();
