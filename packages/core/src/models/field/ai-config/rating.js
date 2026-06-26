"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ratingFieldAIConfigSchema = exports.ratingFieldCustomizeAIConfigSchema = exports.ratingFieldRatingAIConfigSchema = exports.buildRatingFieldOutputSchema = void 0;
const zod_1 = require("zod");
const utils_1 = require("../../../utils");
const text_1 = require("./text");
// === OUTPUT SCHEMA (per D-16-01) ===
// Factory: int in [1, max]. Default max=5 (matches rating field default).
const buildRatingFieldOutputSchema = (max = 5) => {
    return zod_1.z.number().int().min(1).max(max);
};
exports.buildRatingFieldOutputSchema = buildRatingFieldOutputSchema;
// === END OUTPUT SCHEMA ===
exports.ratingFieldRatingAIConfigSchema = text_1.commonFieldAIConfig.extend({
    type: zod_1.z.literal(text_1.FieldAIActionType.Rating),
    sourceFieldId: zod_1.z.string().startsWith(utils_1.IdPrefix.Field),
});
exports.ratingFieldCustomizeAIConfigSchema = text_1.commonFieldAIConfig.extend({
    type: zod_1.z.literal(text_1.FieldAIActionType.Customization),
    prompt: zod_1.z.string(),
});
exports.ratingFieldAIConfigSchema = zod_1.z.discriminatedUnion('type', [
    exports.ratingFieldRatingAIConfigSchema,
    exports.ratingFieldCustomizeAIConfigSchema,
]);
