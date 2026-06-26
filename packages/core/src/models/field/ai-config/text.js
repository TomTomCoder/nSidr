"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.textFieldAIConfigSchema = exports.textFieldCustomizeAIConfigSchema = exports.textFieldImproveTextAIConfigSchema = exports.textFieldTranslateAIConfigSchema = exports.textFieldSummarizeAIConfigSchema = exports.textFieldExtractInfoAIConfigSchema = exports.commonFieldAIConfig = exports.FieldAIActionType = exports.textFieldOutputSchema = void 0;
const zod_1 = require("zod");
const utils_1 = require("../../../utils");
// === OUTPUT SCHEMA (per D-16-01) ===
// Per-output-type Zod schema for validating LLM-produced cell values BEFORE write.
// Distinct from the INPUT schema below (which validates user-supplied AI config).
exports.textFieldOutputSchema = zod_1.z.string();
// === END OUTPUT SCHEMA ===
var FieldAIActionType;
(function (FieldAIActionType) {
    FieldAIActionType["Summary"] = "summary";
    FieldAIActionType["Translation"] = "translation";
    FieldAIActionType["Improvement"] = "improvement";
    FieldAIActionType["Extraction"] = "extraction";
    FieldAIActionType["Classification"] = "classification";
    FieldAIActionType["Tag"] = "tag";
    FieldAIActionType["Customization"] = "customization";
    FieldAIActionType["ImageGeneration"] = "imageGeneration";
    FieldAIActionType["ImageCustomization"] = "imageCustomization";
    FieldAIActionType["Rating"] = "rating";
})(FieldAIActionType || (exports.FieldAIActionType = FieldAIActionType = {}));
exports.commonFieldAIConfig = zod_1.z.object({
    modelKey: zod_1.z.string(),
    isAutoFill: zod_1.z.boolean().nullable().optional(),
    attachPrompt: zod_1.z.string().optional(),
});
exports.textFieldExtractInfoAIConfigSchema = exports.commonFieldAIConfig.extend({
    type: zod_1.z.literal(FieldAIActionType.Extraction),
    sourceFieldId: zod_1.z.string().startsWith(utils_1.IdPrefix.Field),
});
exports.textFieldSummarizeAIConfigSchema = exports.commonFieldAIConfig.extend({
    type: zod_1.z.literal(FieldAIActionType.Summary),
    sourceFieldId: zod_1.z.string().startsWith(utils_1.IdPrefix.Field),
});
exports.textFieldTranslateAIConfigSchema = exports.commonFieldAIConfig.extend({
    type: zod_1.z.literal(FieldAIActionType.Translation),
    sourceFieldId: zod_1.z.string().startsWith(utils_1.IdPrefix.Field),
    targetLanguage: zod_1.z.string(),
});
exports.textFieldImproveTextAIConfigSchema = exports.commonFieldAIConfig.extend({
    type: zod_1.z.literal(FieldAIActionType.Improvement),
    sourceFieldId: zod_1.z.string().startsWith(utils_1.IdPrefix.Field),
});
exports.textFieldCustomizeAIConfigSchema = exports.commonFieldAIConfig.extend({
    type: zod_1.z.literal(FieldAIActionType.Customization),
    prompt: zod_1.z
        .string()
        .describe(`The prompt to use for the AI operation, use {fieldId} to reference the field in the table, example: "Summarize the content of {fieldId} into 100 words"\n`),
});
exports.textFieldAIConfigSchema = zod_1.z.discriminatedUnion('type', [
    exports.textFieldExtractInfoAIConfigSchema,
    exports.textFieldSummarizeAIConfigSchema,
    exports.textFieldTranslateAIConfigSchema,
    exports.textFieldImproveTextAIConfigSchema,
    exports.textFieldCustomizeAIConfigSchema,
]);
