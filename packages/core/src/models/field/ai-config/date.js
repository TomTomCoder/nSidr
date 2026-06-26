"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateFieldAIConfigSchema = exports.dateFieldCustomizeAIConfigSchema = exports.dateFieldExtractionAIConfigSchema = exports.dateFieldOutputSchema = void 0;
const zod_1 = require("zod");
const utils_1 = require("../../../utils");
const text_1 = require("./text");
// === OUTPUT SCHEMA (per D-16-01) ===
// Accepts ISO-8601 string (with offset) OR epoch-ms integer.
exports.dateFieldOutputSchema = zod_1.z.union([
    zod_1.z.string().datetime({ offset: true }),
    zod_1.z.number().int().nonnegative(),
]);
// === END OUTPUT SCHEMA ===
exports.dateFieldExtractionAIConfigSchema = text_1.commonFieldAIConfig.extend({
    type: zod_1.z.literal(text_1.FieldAIActionType.Extraction),
    sourceFieldId: zod_1.z.string().startsWith(utils_1.IdPrefix.Field),
});
exports.dateFieldCustomizeAIConfigSchema = text_1.commonFieldAIConfig.extend({
    type: zod_1.z.literal(text_1.FieldAIActionType.Customization),
    prompt: zod_1.z.string(),
});
exports.dateFieldAIConfigSchema = zod_1.z.discriminatedUnion('type', [
    exports.dateFieldExtractionAIConfigSchema,
    exports.dateFieldCustomizeAIConfigSchema,
]);
