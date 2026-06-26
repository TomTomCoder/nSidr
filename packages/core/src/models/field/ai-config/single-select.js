"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.singleSelectFieldAIConfigSchema = exports.singleSelectFieldCustomizeAIConfigSchema = exports.singleSelectFieldClassifyAIConfigSchema = exports.buildSingleSelectFieldOutputSchema = void 0;
const zod_1 = require("zod");
const utils_1 = require("../../../utils");
const text_1 = require("./text");
// === OUTPUT SCHEMA (per D-16-01) ===
// Factory: when choices configured returns z.enum([names]); else degrades to z.string().
const buildSingleSelectFieldOutputSchema = (choices) => {
    const names = (choices ?? []).map((c) => c.name).filter((n) => typeof n === 'string' && n.length);
    if (names.length === 0) {
        return zod_1.z.string();
    }
    return zod_1.z.enum(names);
};
exports.buildSingleSelectFieldOutputSchema = buildSingleSelectFieldOutputSchema;
// === END OUTPUT SCHEMA ===
exports.singleSelectFieldClassifyAIConfigSchema = text_1.commonFieldAIConfig.extend({
    type: zod_1.z.literal(text_1.FieldAIActionType.Classification),
    sourceFieldId: zod_1.z.string().startsWith(utils_1.IdPrefix.Field),
});
exports.singleSelectFieldCustomizeAIConfigSchema = text_1.commonFieldAIConfig.extend({
    type: zod_1.z.literal(text_1.FieldAIActionType.Customization),
    prompt: zod_1.z.string(),
    onlyAllowConfiguredOptions: zod_1.z.boolean().optional(),
});
exports.singleSelectFieldAIConfigSchema = zod_1.z.discriminatedUnion('type', [
    exports.singleSelectFieldClassifyAIConfigSchema,
    exports.singleSelectFieldCustomizeAIConfigSchema,
]);
