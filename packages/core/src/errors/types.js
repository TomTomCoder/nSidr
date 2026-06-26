"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localizationSchema = void 0;
const zod_1 = require("zod");
exports.localizationSchema = zod_1.z.object({
    i18nKey: zod_1.z.string(),
    context: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
