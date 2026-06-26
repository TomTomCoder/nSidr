"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multipleSelectFieldAIConfigSchema = exports.multipleSelectFieldCustomizeAIConfigSchema = exports.multipleSelectFieldTagAIConfigSchema = exports.buildMultipleSelectFieldOutputSchema = void 0;
const zod_1 = require("zod");
const utils_1 = require("../../../utils");
const text_1 = require("./text");
// === OUTPUT SCHEMA (per D-16-01) ===
// Factory: array of choice names; empty array valid; degrades to z.array(z.string()) without choices.
const buildMultipleSelectFieldOutputSchema = (choices) => {
    const names = (choices ?? []).map((c) => c.name).filter((n) => typeof n === 'string' && n.length);
    if (names.length === 0) {
        return zod_1.z.array(zod_1.z.string()).min(0);
    }
    return zod_1.z.array(zod_1.z.enum(names)).min(0);
};
exports.buildMultipleSelectFieldOutputSchema = buildMultipleSelectFieldOutputSchema;
// === END OUTPUT SCHEMA ===
exports.multipleSelectFieldTagAIConfigSchema = text_1.commonFieldAIConfig.extend({
    type: zod_1.z.literal(text_1.FieldAIActionType.Tag),
    sourceFieldId: zod_1.z.string().startsWith(utils_1.IdPrefix.Field),
});
exports.multipleSelectFieldCustomizeAIConfigSchema = text_1.commonFieldAIConfig.extend({
    type: zod_1.z.literal(text_1.FieldAIActionType.Customization),
    prompt: zod_1.z.string(),
    onlyAllowConfiguredOptions: zod_1.z.boolean().optional(),
});
exports.multipleSelectFieldAIConfigSchema = zod_1.z.discriminatedUnion('type', [
    exports.multipleSelectFieldTagAIConfigSchema,
    exports.multipleSelectFieldCustomizeAIConfigSchema,
]);
